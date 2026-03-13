import { useInput } from "./use-input";

/*
export function useSelect({
    source,
    options,
    nullable,
    onChange: _onChange,
    format,
    validate,
    locked,
    opts,
}) {
    //
    const inputProps = useInput({
        source,
        onChange: _onChange,
        format,
        validate,
        locked,
        opts,
    });

    const isObjVal = typeof inputProps.value === "object";

    let items = options.map((item) => {
        //
        const isObjOpt = typeof item === "object";

        const id = isObjOpt ? item?.id : item;
        const label = isObjOpt ? item?.label || item?.name : item;
        const image = isObjOpt ? item?.image : null;
        const value = isObjVal ? item : id;

        return {
            id: String(id),
            label,
            image,
            value,
        };
    });

    if (nullable) {
        //
        items = [{ id: "null", label: "None", value: null }, ...items];
    }

    const onChange = (id: string) => {
        //
        let value = items.find((item) => item.id == id)?.value;

        _onChange(value);
    };

    const value = isObjVal ? inputProps.value?.id : inputProps.value;

    return {
        ...inputProps,
        items,
        value: String(value),
        onChange,
    };
}
*/
