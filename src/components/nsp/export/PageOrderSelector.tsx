import { GripVertical, Lock } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";

export interface PageSection {
  id: string;
  label: string;
  locked?: boolean;
}

interface PageOrderSelectorProps {
  pageOrder: PageSection[];
  onReorder: (newOrder: PageSection[]) => void;
  enabledSections: Set<string>;
}

export function PageOrderSelector({ pageOrder, onReorder, enabledSections }: PageOrderSelectorProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pageOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items);
  };

  // Filter to show only enabled sections
  const visibleSections = pageOrder.filter(section => 
    section.locked || enabledSections.has(section.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <GripVertical className="h-4 w-4" />
        <span>Drag to reorder pages (Cover page is always first)</span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="page-order">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {visibleSections.map((section, index) => (
                <Draggable
                  key={section.id}
                  draggableId={section.id}
                  index={index}
                  isDragDisabled={section.locked}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-3 flex items-center gap-3 transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      } ${section.locked ? 'bg-muted/50' : 'hover:bg-accent/5'}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      
                      {section.locked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing" />
                        </div>
                      )}
                      
                      <span className="flex-1 text-sm font-medium">
                        {section.label}
                      </span>
                      
                      {section.locked && (
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                          Fixed
                        </span>
                      )}
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
