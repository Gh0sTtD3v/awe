import type { ReactElement } from "react";

interface DragDestinationProps<T> {
    [key: string]: any,
    onReceiveData?: (data?: T, files?: FileList) => void,
    onDragOver?: (DragEvent) => void,
    children?: ReactElement | ReactElement[],
    dropEffect?: "move" | "copy",
}

export default function DragDestination<T extends { dataType: string }>({
    onReceiveData,
    onDragOver,
    children,
    dropEffect,
    ...props
}: DragDestinationProps<T>) {

    return <div
        {...props}
        onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = dropEffect;
            onDragOver?.(e);
        }}
        onDrop={(e) => {
            e.preventDefault();
            const jsonString = e.dataTransfer.getData("application/json")
            try {
                onReceiveData?.(JSON.parse(jsonString), e.dataTransfer.files)
            } catch(error) {
                onReceiveData?.(null, e.dataTransfer.files)
            }
        }}
    >
        {children}
    </div>
}