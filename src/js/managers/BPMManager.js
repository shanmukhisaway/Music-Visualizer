import { EventDispatcher } from 'three'
import { guess } from 'web-audio-beat-detector'

export default class BPMManager extends EventDispatcher {
  constructor() {
    super()
    this.interval = 500 
    this.intervalId = null 
    this.bpmValue = 0 
  }

  setBPM(bpm) {
    this.interval = 60000 / bpm
    clearInterval(this.intervalId)
    this.intervalId = setInterval(this.updateBPM.bind(this), this.interval)
  }

  updateBPM() {
    this.dispatchEvent({ type: 'beat' })
  }

  async detectBPM(audioBuffer) {
    const { bpm } = await guess(audioBuffer)
    this.setBPM(bpm)
    console.log(`BPM detected: ${bpm}`)
  }

  getBPMDuration() {
    return this.interval
  }
}
