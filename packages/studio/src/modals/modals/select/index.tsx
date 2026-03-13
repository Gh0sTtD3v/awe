import { showModal } from "../../context";

function SelectParam({ items, type, onClick, onClose, title }: any) {
  //
  function render(item, i) {
    const currentParams = item._paramsConfig?.params;
    const _params =
      currentParams &&
      currentParams
        .map((param, i) => renderParam(item, param, [], i))
        .filter((x) => x);
    const _childs =
      item.childComponents && item.childComponents.map(render).filter((x) => x);

    if (!_childs?.length && !_params?.length) return null;

    return (
      <div key={i}>
        <div className="relative text-[15px] font-normal p-[5px] flex items-center leading-none bg-white/10 opacity-50">
          {item.componentName || item.componentType}
        </div>
        <div className="pl-5">{_params}</div>
        <div className="pl-5">{_childs}</div>
      </div>
    );
  }

  function renderParam(item, data, path, i) {
    const _path = structuredClone(path);
    _path.push(data.key);
    switch (true) {
      case !data?.param?.type:
        return null;
      case data.key && filterObj[data.key]:
        return null;
      case data.param.type === type: {
        return (
          <div
            key={i}
            className="relative text-[15px] font-normal p-[5px] flex items-center leading-none bg-white/10 cursor-pointer hover:bg-white/20"
            onClick={(e) => {
              onClick(item, _path, data.param);
              onClose?.();
            }}
          >
            {data.param.name || data.key}
          </div>
        );
      }
      case data.param.type === "group": {
        const childs = Object.values(data.param.children || {})
          .map((v, i) => renderParam(item, v, _path, i))
          .filter((x) => x);
        if (!childs.length) return null;
        return (
          <div>
            <div className="relative text-[15px] font-normal p-[5px] flex items-center leading-none bg-white/10 opacity-50">{data.param?.name || data.key}</div>
            <div className="pl-5">{childs}</div>
          </div>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div className="flex gap-2.5 flex-col overflow-hidden items-center w-full h-full">
      <h1 className="text-center text-[17px] font-normal">{title || "Select param to bind"}</h1>
      <div className="w-full pb-5 flex-1 overflow-y-auto [scrollbar-width:auto] [scrollbar-color:#636363_transparent]">{items.map(render)}</div>
    </div>
  );
}

const filterObj = {
  children: true,
  _version: true,
  kit: true,
  parent: true,
  id: true,
  prefab: true,
  $$module: true,
  type: true,
  root: true,
  name: true,
};

export function showSelectParam(items, type, onClick, title?: string) {
  items = items.filter((x) => x.parent == x.container);
  showModal<void>(
    <SelectParam items={items} type={type} onClick={onClick} title={title} />,
    {
      className: "select-modal bg-studio-darker text-white overflow-hidden [&>div>div]:pt-5 [&>div>div]:px-0 [&>div>div]:pb-0",
    }
  );
}
