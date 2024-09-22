# Getting Started



<p>We will initialize our Three.js scene only after the user interacts; this way, we can enable the audio to autoplay and avoid the block policy of the main browsers.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">export default class App {
  constructor() {
    this.onClickBinder = () =&gt; this.init()
    document.addEventListener(&#039;click&#039;, this.onClickBinder)
  }

  init() {
    document.removeEventListener(&#039;click&#039;, this.onClickBinder)
    
    //BASIC THREEJS SCENE
    this.renderer = new THREE.WebGLRenderer()
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000)
    this.scene = new THREE.Scene()
  }
}</code></pre>



# Analyzing Audio Data



<p>Next, we initialize our Audio and BPM Managers. They are responsible for loading the audio, analyzing it, and synchronizing it with the visual elements.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">async createManagers() {
	App.audioManager = new AudioManager()
  await App.audioManager.loadAudioBuffer()

  App.bpmManager = new BPMManager()
  App.bpmManager.addEventListener(&#039;beat&#039;, () =&gt; {
    this.particles.onBPMBeat()
  })
  await App.bpmManager.detectBPM(App.audioManager.audio.buffer)
}</code></pre>



<p>The <strong><code>AudioManager</code></strong> class then loads the audio from a URL—we are using a Spotify Preview URL—and analyzes it to break down the audio signals into frequency bins in real-time.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">const audioLoader = new THREE.AudioLoader();
audioLoader.load(this.song.url, buffer =&gt; {
	this.audio.setBuffer(buffer);
})</code></pre>



# Frequency Data



<p>We have to segregate the frequency spectrum into low, mid, and high bands to calculate the amplitudes.</p>



<figure class="wp-block-image size-large is-resized"><img decoding="async" width="800" height="329" src="https://codrops-1f606.kxcdn.com/codrops/wp-content/uploads/2023/12/Vibration-Amplitude-vs-Time-and-Frequency-800x329.jpeg?x62774" alt="" class="wp-image-74703" style="aspect-ratio:2.43161094224924;width:836px;height:auto" srcset="https://codrops-1f606.kxcdn.com/codrops/wp-content/uploads/2023/12/Vibration-Amplitude-vs-Time-and-Frequency-800x329.jpeg?x62774 800w, https://codrops-1f606.kxcdn.com/codrops/wp-content/uploads/2023/12/Vibration-Amplitude-vs-Time-and-Frequency-400x164.jpeg?x62774 400w, https://codrops-1f606.kxcdn.com/codrops/wp-content/uploads/2023/12/Vibration-Amplitude-vs-Time-and-Frequency-768x316.jpeg?x62774 768w, https://codrops-1f606.kxcdn.com/codrops/wp-content/uploads/2023/12/Vibration-Amplitude-vs-Time-and-Frequency.jpeg?x62774 1024w" sizes="(max-width: 800px) 100vw, 800px" /></figure>



<p>To segment the bands, we need to define start and end points (e.g., the low band range starts at the <strong><code>lowFrequency</code></strong> value and ends at the <strong><code>midFrequency</code></strong> start value). To get the average amplitude, simply multiply the frequencies by the buffer length, then divide by the sample rate, and normalize it to a 0-1 scale.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">this.lowFrequency = 10;
this.frequencyArray = this.audioAnalyser.getFrequencyData();
const lowFreqRangeStart = Math.floor((this.lowFrequency * this.bufferLength) / this.audioContext.sampleRate)
const lowFreqRangeEnd = Math.floor((this.midFrequency * this.bufferLength) / this.audioContext.sampleRate)
const lowAvg = this.normalizeValue(this.calculateAverage(this.frequencyArray, lowFreqRangeStart, lowFreqRangeEnd));
</code></pre>



# Detecting Tempo



<p>The amplitude of the frequencies isn&#8217;t enough to align the music beat with the visual elements. Detecting the BPM (Beats Per Minute) is essential to make the elements react in sync with the pulse of the music. In Coala&#8217;s project, we feature many songs from their artists&#8217; label, and we don&#8217;t know the tempo of each piece of music. Therefore, we are detecting the BPM asynchronously using the amazing <strong><code>web-audio-beat-detector</code></strong> module, by simply passing the audioBuffer.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">const { bpm } = await guess(audioBuffer);</code></pre>



# Dispatching the Signals



<p>After detecting the BPM, we can dispatch the event signal using <strong><code>setInterval</code></strong>.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">this.interval = 60000 / bpm; // Convert BPM to interval
this.intervalId = setInterval(() =&gt; {
	this.dispatchEvent({ type: &#039;beat&#039; })
}, this.interval);</code></pre>



# Procedural Reactive Particles (The fun part 😎)



<p>Now, we&#8217;re going to create our dynamic particles that will soon be responsive to audio signals. Let&#8217;s start with two new functions that will create basic geometries (<strong><code>Box</code> </strong>and<strong> <code>Cylinder</code>)</strong> with random segments and properties; this approach will result in a unique structure each time.</p>



<p>Next, we&#8217;ll add this geometry to a <strong><code>THREE.Points</code> </strong>object with a simple <strong><code>ShaderMaterial</code></strong>.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">const geometry = new THREE.BoxGeometry(1, 1, 1, widthSeg, heightSeg, depthSeg)
const material = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: vertex,
  fragmentShader: fragment,
  transparent: true,
  uniforms: {
    size: { value: 2 },
  },
})
const pointsMesh = new THREE.Points(geometry, material)</code></pre>



<p>Now, we can begin creating our meshes with random attributes in a specified interval:</p>


# Animating the particles



<p>To summarize, in the vertex shader, we animate the points to achieve dynamic effects that dictate the particles&#8217; behavior and appearance. Starting with <strong><code>newpos</code></strong>, which is the original position of each point, we create a target. This target adds curl noise along its normal vector, varying based on frequency and amplitude uniforms. It is interpolated by the power of the distance <strong><code>d</code></strong> between them. This process creates a smooth transition, easing out as the point approaches the target.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-cpp">vec3 newpos = position;
vec3 target = position + (normal * .1) + curl(newpos.x * frequency, newpos.y * frequency, newpos.z * frequency) * amplitude;
float d = length(newpos - target) / maxDistance;
newpos = mix(position, target, pow(d, 4.));</code></pre>



<p>We also add a wave motion to <strong><code>newpos.z</code></strong> , adding an extra layer of liveliness to the animation.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-cpp">newpos.z += sin(time) * (.1 * offsetGain);</code></pre>



<p>Moreover, the size of each point adjusts dynamically based on how close the point is to its target and its depth in the scene, making the animation feel more three-dimensional.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-cpp">gl_PointSize = size + (pow(d,3.) * offsetSize) * (1./-mvPosition.z);</code></pre>



<p>Here it is:</p>




# Adding Colors



<p>In the fragment shader, we are masking out the point with a <a href="https://thebookofshaders.com/07/" target="_blank" rel="noreferrer noopener">circle shape function</a> and interpolating the <strong><code>startColor</code></strong> and <strong><code>endColor</code></strong> uniforms according to the point&#8217;s <strong><code>vDistance</code></strong> defined in the vertex:</p>



<pre class="wp-block-prismatic-blocks"><code class="language-cpp">vec3 circ = vec3(circle(uv,1.));
vec3 color = mix(startColor,endColor,vDistance);
gl_FragColor=vec4(color,circ.r * vDistance);</code></pre>



<h2 class="wp-block-heading">Bringing Audio and Visuals Together</h2>



<p>Now, we can use our creativity to assign the audio data and beat to all the properties, both in the vertex and fragment shader uniforms. We can also add some random animations to the scale, position and rotation using GSAP.</p>



<pre class="wp-block-prismatic-blocks"><code class="language-javascript">update() {
  // Dynamically update amplitude based on the high frequency data from the audio manager
  this.material.uniforms.amplitude.value = 0.8 + THREE.MathUtils.mapLinear(App.audioManager.frequencyData.high, 0, 0.6, -0.1, 0.2)

  // Update offset gain based on the low frequency data for subtle effect changes
  this.material.uniforms.offsetGain.value = App.audioManager.frequencyData.mid * 0.6

  // Map low frequency data to a range and use it to increment the time uniform
  const t = THREE.MathUtils.mapLinear(App.audioManager.frequencyData.low, 0.6, 1, 0.2, 0.5)
  this.time += THREE.MathUtils.clamp(t, 0.2, 0.5) // Clamp the value to ensure it stays within a desired range

  this.material.uniforms.time.value = this.time
}</code></pre>


Check out the [Live Preview](https://ipmv.vercel.app/) 

# Installation

Install dependencies:

```
npm install
```

Compile the code for development and start a local server:

```
npm run dev
```

Create the build:

```
npm run build
```

