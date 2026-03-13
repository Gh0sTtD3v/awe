function areItemsEqual(prevItems: any, nextItems: any) {
  //
  return (
    prevItems.length === nextItems.length &&
    prevItems.every((item, index) => item === nextItems[index])
  );
}

export function arePropsEqual(prevProps: any, nextProps: any) {
  //
  return (
    prevProps.nullable === nextProps.nullable &&
    prevProps.value === nextProps.value &&
    areItemsEqual(prevProps.items, nextProps.items) &&
    prevProps.onChange === nextProps.onChange
  );
}

const isObj = (x) => x != null && typeof x === "object";

export function isEqual(value, item) {
  if (isObj(value) && isObj(item)) {
    return value.id == item.id;
  }

  if (!isObj(value) && isObj(item)) {
    return value == item?.id;
  }

  if (!isObj(value) && !isObj(item)) {
    return value == item;
  }
}
