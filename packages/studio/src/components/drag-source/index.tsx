import type { ReactElement } from "react";

interface DragSourceProps<T> {
    [key: string]: any;
    jsonData: T;
    onDragStart?: (DragEvent) => void;
    children?: ReactElement;
}

export default function DragSource<T extends { dataType: string }>({
    jsonData,
    onDragStart,
    children,
    image,
    ...props
}: DragSourceProps<T>) {
    return (
        <div
            draggable={true}
            {...props}
            onDragStart={(e) => {
                const preview = (e.target as HTMLElement).querySelector(".drag-preview");
                if (image) {
                    e.dataTransfer.setDragImage(preview, 24, 24);
                }
                e.dataTransfer.effectAllowed = "all";

                e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify(jsonData)
                );

                onDragStart?.(e);
            }}
        >
            {children}
        </div>
    );
}
