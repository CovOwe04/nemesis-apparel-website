import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-steel animate-pulse rounded-[6px]" />)}</div>
      ) : jerseys.length === 0 ? (
        <p className="mono-label text-fog/40">NO JERSEYS IN INVENTORY.</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="jersey-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {jerseys.map((j, index) => (
                  <Draggable key={j.id} draggableId={j.id} index={index}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                        className="flex items-center gap-3 border border-steel rounded-[6px] p-3 bg-void">
                        <GripVertical size={16} className="text-fog/30 shrink-0" />
                        <span className="mono-label text-fog/30 w-5 text-center shrink-0">{index + 1}</span>
                        <div className="w-12 h-16 bg-steel shrink-0 overflow-hidden rounded-[4px]">
                          <Image src={j.front_image} alt={j.name} fittingType="fill" className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-heading text-fog text-sm truncate">{j.name}</div>
                          <div className="mono-label text-fog/40 mt-0.5">{j.team} · {j.category || 'Jersey'} · ${j.price}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {j.enable_customization && <span className="mono-label text-kinetic">LAB</span>}
                            {j.is_private && <span className="mono-label text-kinetic">PRIVATE</span>}
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
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}