import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import particlesVertexShader from './shaders/particles/vertex.glsl'
import particlesFragmentShader from './shaders/particles/fragment.glsl'

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const textureLoader = new THREE.TextureLoader()

const displacement = {}
// HTML SIDE
displacement.canvas = document.createElement('canvas')
displacement.canvas.width = 128
displacement.canvas.height = 128
displacement.context = displacement.canvas.getContext('2d')
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)
displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'
displacement.canvas.style.position = 'fixed'
displacement.canvas.style.width = '256px'
displacement.canvas.style.height = '256px'
displacement.canvas.style.top = 0
displacement.canvas.style.left = 0
displacement.canvas.style.zIndex = 10
document.body.append(displacement.canvas)
// THREE SIDE
displacement.interactivePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 'red' })
)
displacement.interactivePlane.visible = false;
scene.add(displacement.interactivePlane)
displacement.raycaster = new THREE.Raycaster()
displacement.screenCursor = new THREE.Vector2(9999, 9999)
displacement.canvasCursor = new THREE.Vector2(9999, 9999)
displacement.texture = new THREE.CanvasTexture(displacement.canvas);
// LISTENERS
window.addEventListener('pointermove', (event) =>
{
    displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1
    displacement.screenCursor.y = - (event.clientY / sizes.height) * 2 + 1
})


const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    particlesMaterial.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 18)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setClearColor('#181818')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128)
particlesGeometry.setIndex(null)
particlesGeometry.deleteAttribute('normal')
const intensitiesArray = new Float32Array(particlesGeometry.attributes.position.count)
const anglesArray = new Float32Array(particlesGeometry.attributes.position.count)

for(let i = 0; i < intensitiesArray.length; i++){
    intensitiesArray[i] = Math.random()
    anglesArray[i] = Math.random() * Math.PI * 2
}
particlesGeometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensitiesArray, 1))
particlesGeometry.setAttribute('aAngle', new THREE.BufferAttribute(anglesArray, 1))

const particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms:
    {
        uResolution: new THREE.Uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)),
        uPictureTexture: new THREE.Uniform(textureLoader.load('./whiteblack.jpg')),
        uDisplacementTexture: new THREE.Uniform(displacement.texture)
    }
})

const particles = new THREE.Points(particlesGeometry, particlesMaterial)
scene.add(particles)

const clock = new THREE.Clock()
let prevTime = 0;
const tick = () =>
{
    controls.update()
    renderer.render(scene, camera)

    displacement.raycaster.setFromCamera(displacement.screenCursor, camera)
    const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane)

    if(intersections.length)
    {
        const uv = intersections[0].uv
        displacement.canvasCursor.x = uv.x * displacement.canvas.width
        displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height
    }

    if(clock.getElapsedTime() - prevTime >= 0.05){
        prevTime = clock.getElapsedTime();
        displacement.context.globalCompositeOperation = 'source-over'
        displacement.context.globalAlpha = 0.1
        displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)
    }

    const glowSize = displacement.canvas.width * 0.25
    displacement.context.globalCompositeOperation = 'lighten'
    displacement.context.globalAlpha = 1
    displacement.context.drawImage(
        displacement.glowImage,
        displacement.canvasCursor.x - glowSize * 0.5,
        displacement.canvasCursor.y - glowSize * 0.5,
        glowSize,
        glowSize
    )

    displacement.texture.needsUpdate = true;

    window.requestAnimationFrame(tick)
}

tick()