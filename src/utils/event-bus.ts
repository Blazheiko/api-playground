import mitt from 'mitt'

export type Events = Record<string, unknown>

const emitter = mitt<Events>()

export const useEventBus = () => emitter
