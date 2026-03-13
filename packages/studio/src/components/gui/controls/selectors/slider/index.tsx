import React, { useEffect, useRef, useState } from "react";
import { classes } from "../../../../../utils/classes";
import { arePropsEqual, isEqual } from "../common";
import Splide from "@splidejs/splide";

interface SliderProps {
  nullable: boolean;
  value: any;
  items: any[];
  onChange: (value: any) => void;
  objectFit?: "cover" | "contain";
  aspectRatio?: number;
}

function _Slider({
  nullable,
  value,
  items,
  onChange,
  objectFit = "contain",
  aspectRatio = null,
}: SliderProps) {
  //
  // console.log("rendering Slider...");
  //

  const slider = useRef(null);
  const sliderInstance = useRef(null);

  const previousItems = useRef(null);

  const [index, setIndex] = useState(
    items.findIndex((item) => item.id === value.id),
  );

  const onClick = (index) => {
    if (sliderInstance.current) {
      sliderInstance.current.go(index);
    }
  };

  const handleToggle = (newValue) => {
    //
    if (value == null || typeof value != "object") {
      newValue = newValue?.id ?? newValue;
    }

    onChange(newValue);
  };

  useEffect(() => {
    if (slider.current) {
      previousItems.current = items;

      sliderInstance.current = new Splide(slider.current, {
        pagination: false,
        arrows: false,
        start: index,
        speed: 300,
        perPage: 1,
        isNavigation: true,
        drag: items.length > 1,
      }).mount();

      sliderInstance.current.on("move", () => {
        setIndex(sliderInstance.current.index);
      });
    }

    return () => {
      if (sliderInstance.current) {
        sliderInstance.current.destroy();
        sliderInstance.current = null;
      }
    };
  }, [items]);

  return (
    <div
      className={classes(
        "slider-selector relative -ml-2.5 w-[calc(100%+20px)] cursor-grab",
        items.length > 3 && "sliding-allowed",
        value?.id !== "custom" && "has-selected",
      )}
    >
      <div
        className="absolute top-0 left-[calc(50%-30px)] w-[60px] aspect-square rounded-[10px] border border-white transition-opacity duration-300 ease-out-quad pointer-events-none z-10"
        style={{ aspectRatio }}
      />

      <div className="mx-auto w-[60px]">
        <div className="splide" ref={slider}>
          <div className="splide__track">
            <div className="splide__list">
              {items.map((item, i) => {
                //
                const isObject = typeof item === "object";

                const id = isObject ? item?.id : item;

                const label = isObject ? item?.label || item?.name : item;

                const active = isEqual(value, item);

                useEffect(() => {
                  if (i === index && !active) {
                    handleToggle(item);
                  }
                }, [index]);

                return (
                  <div
                    key={`SelectSlider-item${label}-${i}`}
                    className="splide__slide"
                  >
                    <button
                      type="button"
                      className={classes("w-full", active && "active")}
                      onClick={() => {
                        if (active) return;
                        handleToggle(item);
                        onClick(i);
                      }}
                    >
                      <figure
                        className="aspect-square relative w-full"
                        style={{ aspectRatio }}
                      >
                        <img
                          className="absolute top-0 left-0 w-full h-full block object-cover rounded-lg"
                          src={
                            item.image ??
                            "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w"
                          }
                          style={{
                            objectFit,
                          }}
                        />
                      </figure>

                      <span className="mt-2 block w-full text-center text-white/60 text-[13px] font-normal leading-[15px] whitespace-nowrap text-ellipsis overflow-hidden px-[3px] transition-colors duration-300 ease-out-quad">
                        {label}
                      </span>
                    </button>
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

export const Slider = React.memo(_Slider, arePropsEqual);
