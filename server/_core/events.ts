import { EventEmitter } from "events";

class VRIFEventEmitter extends EventEmitter {}

export const vrifEvents = new VRIFEventEmitter();
