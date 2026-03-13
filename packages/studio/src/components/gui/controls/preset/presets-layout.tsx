import { useEffect, useRef, useState } from "react";
import { classes } from "../../../../utils/classes";
import { useAllPresets } from "../../use-presets";
import Splide from "@splidejs/splide";

export function PresetsLayout({ items, source, onChange, objectFit }) {
  const slider = useRef(null);
  const sliderInstance = useRef(null);
  const [index, setIndex] = useState(null);

  const { presets, active } = useAllPresets({
    configs: items,
    source: source,
    onChange: onChange,
  });

  const onClick = (index) => {
    if (sliderInstance.current) {
      sliderInstance.current.go(index);
    }
  };

  useEffect(() => {
    if (slider.current) {
      sliderInstance.current = new Splide(slider.current, {
        pagination: false,
        arrows: false,
        start: active,
        speed: 300,
        perPage: 3,
        focus: "center",
        isNavigation: true,
        drag: items.length > 1,
        gap: "8px",
        trimSpace: false,
      }).mount();
    }

    sliderInstance.current.on("move", () => {
      setIndex(sliderInstance.current.index);
    });

    return () => {
      if (sliderInstance.current) {
        sliderInstance.current.destroy();
        sliderInstance.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div
        className={classes(
          "presets-carousel relative -ml-2.5 w-[calc(100%+20px)] cursor-grab",
          items.length > 1 && "sliding-allowed",
          active >= 0 && "has-selected",
        )}
      >
        <div className="absolute top-0 left-[calc(50%-30px)] w-[60px] aspect-square rounded-[10px] border border-white opacity-20 transition-opacity duration-300 ease-out-quad pointer-events-none z-10" />
        <div className={classes("mx-auto w-[200px] splide")} ref={slider}>
          <div className="splide__track">
            <div className="splide__list">
              {presets.map((preset, i) => {
                useEffect(() => {
                  if (i === index && !preset.selected) {
                    preset.onClick();
                  }
                }, [index]);

                return (
                  <div
                    key={`PresetsCarousel-item${preset.label}-${i}`}
                    className="splide__slide"
                  >
                    <div
                      key={`SelectSlider-item${preset.label}-${i}`}
                      className="splide__slide"
                    >
                      <button
                        type="button"
                        className={classes(
                          "w-full",
                          preset.selected && "active",
                        )}
                        onClick={() => {
                          if (active) return;
                          onClick(i);
                          preset.onClick();
                        }}
                      >
                        <figure className="aspect-square relative w-full">
                          <img
                            className="absolute top-0 left-0 w-full h-full block object-cover rounded-lg"
                            src={
                              preset.image ??
                              "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w"
                            }
                            style={{
                              objectFit,
                            }}
                          />
                        </figure>

                        <span className="mt-2 block w-full text-center text-white/60 text-[13px] font-normal leading-[15px] whitespace-nowrap text-ellipsis overflow-hidden px-[3px] transition-colors duration-300 ease-out-quad">
                          {preset.label}
                        </span>
                      </button>
                    </div>
                    {/*
                                        <Card
                                            image={preset.image}
                                            alt={preset.alt}
                                            label={preset.label}
                                            selected={preset.selected}
                                            objectFit={objectFit}
                                            onClick={() => {
                                                onClick(i);
                                                preset.onClick();
                                            }}
                                        /> */}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
