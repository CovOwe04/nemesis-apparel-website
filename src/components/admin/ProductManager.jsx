import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus, GripVertical, Lock, Star } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function getColors(j) {
  if (j.colors && j.colors.length > 0) return j.colors;
  if (j.images && j.images.length > 0)
    return [{ name: 'Default', hex: '#000000', images: j.images.map((img) => ({ url: img.url })) }];
  return [{ name: 'Default', hex: '#000000', images: [{ url: j.front_image }] }];
}

function totalImages(j) {
  return getColors(j).reduce((sum, c) => sum + (c.images?.length || 0), 0);
}

export default function ProductManager() {
  const [jerseys, setJerseys] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadJerseys = () => {
    setLoadingList(true);
    base44.entities.Jersey.list('-created_date', 100)
      .then((d) => {
        const sorted = (d || []).sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
        setJerseys(sorted);
      })
      .catch(() => setJerseys([]))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadJerseys(); }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(jerseys);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((j, i) => ({ id: j.id, sort_order: i }));
    setJerseys(reordered);
    try {
      await base44.entities.Jersey.bulkUpdate(updates);
    } catch {
      loadJerseys();
    }
  };

  const deleteJersey = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await base44.entities.Jersey.delete(id); loadJerseys(); }
    catch { alert('Delete failed.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="mono-label text-kinetic">INVENTORY — DRAG TO REORDER</div>
        <Link to="/nexus-control/editor" className="btn-solid inline-flex items-center gap-2 px-5 py-2.5 mono-label">
          <Plus size={16} /> ADD NEW
        </Link>
      </div>
      {loadingList ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : jerseys.length === 0 ? (
        <p className="mono-label text-fog/40">NO LISTINGS IN INVENTORY.</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="jersey-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {jerseys.map((j, index) => {
                  const colors = getColors(j);
                  const imgCount = totalImages(j);
                  const comboCount = (j.name_number_combos || []).length;
                  const now = new Date();
                  const upcoming = j.available_from && new Date(j.available_from) > now;
                  const expired = j.available_until && new Date(j.available_until) < now;
                  return (
                    <Draggable key={j.id} draggableId={j.id} index={index}>
                      {(p) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                          className="flex items-start gap-3 border border-steel rounded-[6px] p-3 bg-void">
                          <GripVertical size={16} className="text-fog/30 shrink-0 mt-1" />
                          <span className="mono-label text-fog/30 w-5 text-center shrink-0 mt-1">{index + 1}</span>
                          <div className="w-16 h-20 bg-steel shrink-0 overflow-hidden rounded-[4px]">
                            <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading text-fog text-sm">{j.name}</span>
                              {j.featured && <Star size={12} className="text-kinetic fill-kinetic" />}
                              {j.is_private && <Lock size={12} className="text-kinetic" />}
                            </div>
                            <div className="mono-label text-fog/40 mt-0.5">{j.team} · {j.category || 'Jersey'} · {j.fitting || 'Regular'} · ${j.price}</div>
                            {j.description && (
                              <p className="text-fog/40 text-xs mt-1 line-clamp-1">{j.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {/* Color swatches */}
                              <div className="flex items-center gap-1">
                                {colors.slice(0, 6).map((c, ci) => (
                                  <span key={ci} className="w-4 h-4 rounded-full border border-steel"
                                    style={{ backgroundColor: c.hex || '#000' }}
                                    title={c.name || 'Default'} />
                                ))}
                                {colors.length > 6 && <span className="mono-label text-fog/30 text-[0.6rem]">+{colors.length - 6}</span>}
                              </div>
                              <span className="mono-label text-fog/30 text-[0.6rem]">{colors.length} COLOR{colors.length !== 1 ? 'S' : ''} · {imgCount} IMG{imgCount !== 1 ? 'S' : ''}</span>
                              {comboCount > 0 && <span className="mono-label text-fog/30 text-[0.6rem]">· {comboCount} COMBO{comboCount !== 1 ? 'S' : ''}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {j.enable_customization && <span className="mono-label text-kinetic text-[0.6rem]">LAB</span>}
                              {j.enable_customization && j.enable_name && <span className="mono-label text-fog/40 text-[0.6rem]">NAME</span>}
                              {j.enable_customization && j.enable_number && <span className="mono-label text-fog/40 text-[0.6rem]">NUM</span>}
                              {j.is_private && <span className="mono-label text-kinetic text-[0.6rem]">PRIVATE</span>}
                              {upcoming && <span className="mono-label text-fog/40 text-[0.6rem]">SCHEDULED</span>}
                              {expired && <span className="mono-label text-fog/30 text-[0.6rem]">EXPIRED</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Link to={`/nexus-control/editor/${j.id}`} className="btn-solid px-3 py-1.5 mono-label text-xs">
                              Edit
                            </Link>
                            <button onClick={() => deleteJersey(j.id, j.name)} className="p-1.5 text-fog/40 hover:text-kinetic transition-colors" aria-label={`Delete ${j.name}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}