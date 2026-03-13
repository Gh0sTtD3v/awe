import { EffectCallback, useEffect, useRef } from "react"

function noop() {}

export function useEffectOnce(effect: EffectCallback, debug = null) {

    if(process.env.NODE_ENV === "development") {

        const disposer = useRef<ReturnType<EffectCallback>>(undefined)

        useEffect(() => {

            // if(debug) debugger

            if(debug) {

                // console.log(debug)
            }

            if (disposer.current) {
                return disposer.current
            }

            disposer.current = effect() ?? noop

            return noop
        }, [])
    }
    else {

        return useEffect(effect, [])
    }
    
}
