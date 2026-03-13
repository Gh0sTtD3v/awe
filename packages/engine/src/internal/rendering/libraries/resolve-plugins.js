import { VisualPluginRegistry } from '../../../space/components/visual-plugin-registry'
import RainbowPlugin from './visuals/rainbow'
import DamagePlugin from './visuals/damage'
import FresnelGlowPlugin from './visuals/fresnel-glow'
import PulsePlugin from './visuals/pulse'
import DissolveEdgePlugin from './visuals/dissolve-edge'
import HologramPlugin from './visuals/hologram'

// Seed built-in plugins
VisualPluginRegistry.register(RainbowPlugin)
VisualPluginRegistry.register(DamagePlugin)
VisualPluginRegistry.register(FresnelGlowPlugin)
VisualPluginRegistry.register(PulsePlugin)
VisualPluginRegistry.register(DissolveEdgePlugin)
VisualPluginRegistry.register(HologramPlugin)

export function resolvePlugins(descriptors) {
    if (!descriptors || !descriptors.length) return []
    return descriptors.map(d => {
        const Cls = VisualPluginRegistry.get(d.id)
        if (!Cls) {
            console.warn('Unknown plugin: ' + d.id)
            return null
        }
        return new Cls(d)
    }).filter(Boolean)
}
