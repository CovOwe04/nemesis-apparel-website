import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, Loader2, Mail, User, Shirt, Palette } from 'lucide-react';
import ComboImageRenderer from '@/components/admin/ComboImageRenderer';
import ArtworkNameOverlay from '@/components/admin/ArtworkNameOverlay';
import { renderOverlayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { FONTS } from '@/lib/fonts';
import {
  resolveNameStyle,
  resolveNumberStyle,
  resolveArtworkNameStyle,
  resolveArtworkNumberStyle,
} from '@/lib/jerseyStyle';

const resolveFontFam = (jersey) => {
  const f = FONTS.find((x) => x.id === jersey.font_id) || FONTS[0];
  if (jersey.custom_font_name) return `'${jersey.custom_font_name}', ${f.family}`;
  return f.family;
};

export default function DesignReviewModal({ order, onClose, onAction }) {
  const [jerseys, setJerseys] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const items = (() => {
    try { return JSON.parse(order.items_json || '[]'); } catch { return []; }
  })();
  const customItems = items.filter((i) => i.customName || i.customNumber);

  useEffect(() => {
    const jerseyIds = [...new Set(items.map((i) => i.jerseyId).filter(Boolean))];
    Promise.all(jerseyIds.map((id) => base44.entities.Jersey.get(id).catch(() => null)))
      .then((results) => {
        const map = {};
        results.forEach((j) => { if (j) map[j.id] = j; });
        setJerseys(map);
        setLoading(false);
      });
  }, [order.id]);

  const handleApprove = async () => {
    setProcessing(true);
    setError('');
    setProgress('Rendering artwork…');

    try {
      // Render composited display images AND artwork for each custom item,
      // matching the "Generate in Merchize" button's rendering exactly so the
      // custom Merchize product gets the same 3D preview + print file.
      const compositedArtwork = {};
      const compositedDisplay = {};
      const fontFam = resolveFontFam;

      for (let i = 0; i < customItems.length; i++) {
        const item = customItems[i];
        const jersey = jerseys[item.jerseyId];
        if (!jersey) continue;
        const colorObj = (jersey.colors || []).find((c) => c.name === item.colorName);
        const images = colorObj?.images || [];
        const isStatic = images.length <= 1;
        const resolvedNameStyle = resolveNameStyle(jersey, colorObj);
        const resolvedNumberStyle = resolveNumberStyle(jersey, colorObj);
        const resolvedArtworkNameStyle = resolveArtworkNameStyle(jersey, colorObj);
        const resolvedArtworkNumberStyle = resolveArtworkNumberStyle(jersey, colorObj);
        const key = `${item.colorName || 'Default'}|${item.customName || ''}|${item.customNumber || ''}`;
        const fam = fontFam(jersey);

        // 1. Render 3D display image (same params as Generate in Merchize)
        if (images.length > 0) {
          setProgress(`Rendering display ${i + 1}/${customItems.length}…`);
          const displayUrl = isStatic ? images[0].url : images[images.length - 1].url;
          const dispW = isStatic ? 1200 : 900;
          const dispH = isStatic ? 1200 : 1200;
          try {
            const dispBlob = await renderOverlayToBlob({
              imageUrl: displayUrl,
              imageFit: 'cover',
              customName: item.customName,
              customNumber: item.customNumber,
              nameStyle: resolvedNameStyle,
              numberStyle: resolvedNumberStyle,
              fontFam: fam,
              customFontUrl: jersey.custom_font_url,
              customFontName: jersey.custom_font_name,
              enableName: jersey.enable_name,
              enableNumber: jersey.enable_number,
              staticDisplay: isStatic,
              isArtwork: false,
              renderW: dispW,
              renderH: dispH,
            });
            if (dispBlob) {
              const file = new File([dispBlob], `display-${key}.png`, { type: 'image/png' });
              const { file_url } = await base44.integrations.Core.UploadFile({ file });
              compositedDisplay[key] = file_url;
            }
          } catch (err) {
            console.error('Display render failed:', err);
          }
        }

        // 2. Render artwork (print file) — same params as Generate in Merchize
        const artworkFront = colorObj?.artwork_front;
        if (artworkFront) {
          setProgress(`Rendering artwork ${i + 1}/${customItems.length}…`);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = artworkFront;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 5000);
          });
          const naturalW = img.naturalWidth || 1200;
          const naturalH = img.naturalHeight || 1200;
          const maxDim = 1200;
          const sz = Math.min(1, maxDim / Math.max(naturalW, naturalH));
          const renderW = Math.round(naturalW * sz);
          const renderH = Math.round(naturalH * sz);

          try {
            const blob = await renderOverlayToBlob({
              imageUrl: artworkFront,
              imageFit: 'contain',
              customName: item.customName,
              customNumber: item.customNumber,
              nameStyle: resolvedArtworkNameStyle,
              numberStyle: resolvedArtworkNumberStyle,
              fontFam: fam,
              customFontUrl: jersey.custom_font_url,
              customFontName: jersey.custom_font_name,
              enableName: jersey.enable_name,
              enableNumber: jersey.enable_number,
              staticDisplay: isStatic,
              isArtwork: true,
              aspectRatio: naturalW / naturalH,
              renderW,
              renderH,
            });
            if (blob) {
              const file = new File([blob], `artwork-${key}.png`, { type: 'image/png' });
              const { file_url } = await base44.integrations.Core.UploadFile({ file });
              compositedArtwork[key] = file_url;
            }
          } catch (err) {
            console.error('Artwork render failed:', err);
          }
        }
      }

      setProgress('Creating Merchize products & fulfilling…');
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('approve-custom-order', {
        orderId: order.id,
        compositedArtwork,
        compositedDisplay,
        passcode,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        onAction('approved');
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.data?.error ||
        err?.message ||
        'Approval failed',
      );
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this order and issue a full refund? The customer will be emailed.')) return;
    setProcessing(true);
    setError('');
    try {
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('reject-custom-order', { orderId: order.id, passcode });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        onAction('rejected');
      }
    } catch (err) {
      setError(err?.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const orderRef = `#${order.id.slice(-8).toUpperCase()}`;
  const canApprove = order.status === 'pending_approval';

  return (
    <div className="fixed inset-0 bg-void/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-steel rounded-[8px] max-w-5xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-steel px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-heading text-lg uppercase text-fog">Order {orderRef}</h2>
            <div className="mono-label text-fog/50 mt-1 flex items-center gap-3 normal-case tracking-normal text-xs">
              <span className="flex items-center gap-1"><User size={11} /> {order.customer_name}</span>
              <span className="flex items-center gap-1"><Mail size={11} /> {order.customer_email}</span>
              <span>${order.total}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-fog/40 hover:text-fog transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-kinetic" />
            </div>
          ) : (
            customItems.map((item, i) => {
              const jersey = jerseys[item.jerseyId];
              const colorObj = (jersey?.colors || []).find((c) => c.name === item.colorName);
              const images = colorObj?.images || [];
              const isStatic = images.length <= 1;
              const displayImageUrl = (isStatic ? images[0]?.url : images[images.length - 1]?.url) || jersey?.back_image || '';
              const artworkUrl = colorObj?.artwork_front || '';
              const fontFam = jersey?.custom_font_name
                ? `'${jersey.custom_font_name}', ${(FONTS.find((f) => f.id === jersey.font_id) || FONTS[0]).family}`
                : (FONTS.find((f) => f.id === jersey?.font_id) || FONTS[0]).family;
              const resolvedNameStyle = resolveNameStyle(jersey, colorObj);
              const resolvedNumberStyle = resolveNumberStyle(jersey, colorObj);
              const resolvedArtworkNameStyle = resolveArtworkNameStyle(jersey, colorObj);
              const resolvedArtworkNumberStyle = resolveArtworkNumberStyle(jersey, colorObj);

              return (
                <div key={i} className="border border-steel rounded-[6px] p-4">
                  {/* Item header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-heading text-fog text-sm uppercase">{item.name}</div>
                      <div className="mono-label text-fog/50 mt-1 flex items-center gap-3 normal-case tracking-normal text-xs">
                        <span className="flex items-center gap-1"><Palette size={11} /> {item.colorName || 'Default'}</span>
                        <span className="flex items-center gap-1"><Shirt size={11} /> Size {item.shirtSize || 'M'}</span>
                        <span>Qty {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono-label text-kinetic text-xs">CUSTOM</div>
                      <div className="font-heading text-fog text-lg uppercase mt-0.5">{item.customName || '—'}</div>
                      {item.customNumber && <div className="font-heading text-fog/70 text-2xl">#{item.customNumber}</div>}
                    </div>
                  </div>

                  {/* Previews */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Display preview */}
                    <div>
                      <div className="mono-label text-fog/40 mb-2 text-[0.6rem]">DISPLAY PREVIEW</div>
                      {displayImageUrl && jersey ? (
                        <div className="aspect-[3/4] bg-void rounded-[4px] overflow-hidden border border-steel">
                          <ComboImageRenderer
                            imageUrl={displayImageUrl}
                            customName={item.customName}
                            customNumber={item.customNumber}
                            nameStyle={resolvedNameStyle}
                            numberStyle={resolvedNumberStyle}
                            customFontUrl={jersey.custom_font_url}
                            customFontName={jersey.custom_font_name}
                            fontId={jersey.font_id}
                            staticDisplay={isStatic}
                            enableName={jersey.enable_name}
                            enableNumber={jersey.enable_number}
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] bg-void rounded-[4px] border border-steel flex items-center justify-center">
                          <span className="mono-label text-fog/30 text-xs">NO IMAGE</span>
                        </div>
                      )}
                    </div>

                    {/* Artwork preview */}
                    <div>
                      <div className="mono-label text-fog/40 mb-2 text-[0.6rem]">ARTWORK (PRINT FILE)</div>
                      {artworkUrl && jersey ? (
                        <div className="aspect-[3/4] bg-void rounded-[4px] overflow-hidden border border-steel">
                          <ArtworkNameOverlay
                            artworkUrl={artworkUrl}
                            customName={item.customName}
                            customNumber={item.customNumber}
                            nameStyle={resolvedArtworkNameStyle}
                            numberStyle={resolvedArtworkNumberStyle}
                            customFontUrl={jersey.custom_font_url}
                            customFontName={jersey.custom_font_name}
                            fontId={jersey.font_id}
                            aspectRatio={1}
                            enableName={jersey.enable_name}
                            enableNumber={jersey.enable_number}
                            staticDisplay={isStatic}
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] bg-void rounded-[4px] border border-steel flex items-center justify-center">
                          <span className="mono-label text-fog/30 text-xs">NO ARTWORK</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Non-custom items summary */}
          {items.filter((i) => !i.customName && !i.customNumber).length > 0 && (
            <div className="border border-steel rounded-[6px] p-4">
              <div className="mono-label text-fog/50 mb-2 text-[0.65rem]">STANDARD ITEMS (AUTO-FULFILL)</div>
              {items.filter((i) => !i.customName && !i.customNumber).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-fog/70 py-1">
                  <span>{item.name} · {item.colorName || 'Default'} · Size {item.shirtSize || 'M'}</span>
                  <span className="mono-label text-fog/50 text-xs">QTY {item.quantity} · ${item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="sticky bottom-0 bg-card border-t border-steel px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            {error && <p className="mono-label text-kinetic text-[0.65rem]">{error}</p>}
            {progress && <p className="mono-label text-fog/50 text-[0.65rem]">{progress}</p>}
          </div>
          {canApprove ? (
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={processing}
                className="inline-flex items-center gap-2 border border-steel px-5 py-2.5 font-heading uppercase text-fog/60 hover:text-kinetic hover:border-kinetic transition-colors rounded-[6px] disabled:opacity-60 text-xs"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject & Refund
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="inline-flex items-center gap-2 bg-kinetic px-5 py-2.5 font-heading uppercase text-void hover:bg-fog transition-colors rounded-[6px] disabled:opacity-60 text-xs"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {processing ? 'Processing…' : 'Approve & Fulfill'}
              </button>
            </div>
          ) : (
            <span className="mono-label text-fog/40 text-xs">STATUS: {order.status.toUpperCase()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
