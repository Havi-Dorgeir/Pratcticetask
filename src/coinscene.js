import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const canvasElement = document.getElementById("bg");
const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = true;

let cameraX = 0, cameraY = 55.5, cameraZ = -60.0;
camera.position.set(cameraX, cameraY, cameraZ);
const targetPosition = new THREE.Vector3(0, -5.4, -200.0);
camera.lookAt(targetPosition);
controls.target.copy(targetPosition);

let mixer;
let blenderCamera = null;

let scrollActions = [];
let idleActions = [];
let targetScrollTime = 0;
let currentScrollTime = 0;

let model;
let hitboxes = [];
const loader = new GLTFLoader();
loader.load("/model/coinsscene.gltf", function (glb) {
    model = glb.scene;
    scene.add(model);

    if (glb.cameras && glb.cameras.length > 0) {
        blenderCamera = glb.cameras[0];
        blenderCamera.aspect = window.innerWidth / window.innerHeight;
        blenderCamera.updateProjectionMatrix();


        blenderCamera.updateWorldMatrix(true, false);
        const camWorldPos = new THREE.Vector3();
        blenderCamera.getWorldPosition(camWorldPos);


        //blenderCamera.add(particlesMesh);  
        //particlesMesh.position.set(0, -10, -10);


    }

    model.traverse((child) => {
        if (child.isLight) {
            child.intensity *= 0.33;
            child.castShadow = true;
        }
    });

    if (glb.animations && glb.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);

        glb.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);

            if (clip.name === 'ScrollAnimation') {
                action.blendMode = THREE.NormalBlending;
                action.play();
                action.paused = true;
                action.setEffectiveWeight(1.0);
                scrollActions.push(action);
            } else if (clip.name === 'idleAnimation') {
                const action = mixer.clipAction(clip);
                action.blendMode = THREE.NormalBlending;
                action.setLoop(THREE.LoopRepeat);
                action.clampWhenFinished = false;
                action.play();
                action.setEffectiveWeight(1.0);
                idleActions.push(action);
            } else {
                action.play();
            }
        });

        model.traverse((child) => {
            if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                let hitboxGeo;

                if (child.name === "mountain 2" || child.name === "Cylinder" || child.name === "Cylinder.001" || child.name === "Cylinder.002") {
                    hitboxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
                } else if (child.name === "Cylinder_2" || child.name === "Cylinder_3" || child.name === "Cylinder_4") {
                    const radius = Math.max(size.x, size.z) / 2;
                    const tubeThickness = size.y / 2;
                    hitboxGeo = new THREE.TorusGeometry(radius, tubeThickness, 8, 16);
                } else {
                    return;
                }

                const hitboxMat = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    visible: false,
                    wireframe: true
                });

                const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
                hitbox.position.copy(center);

                if (hitboxGeo.type === "TorusGeometry") {
                    hitbox.rotation.x = Math.PI / 2;
                }

                scene.add(hitbox);
                hitboxes.push(hitbox);
            }
        });
    }

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5;
    camera.position.set(center.x, center.y + (maxDim * 0.5), center.z + cameraZDistance);
    camera.lookAt(center);
    controls.update();
});


// --- Частицы ---
const particlesCount = 1200;
const posArray = new Float32Array(particlesCount * 3);


for (let i = 0; i < particlesCount * 3; i += 3) {
    posArray[i] = (Math.random() - 0.5) * 120;
    posArray[i + 1] = 0; // Y не важен — phase всё рандомизирует
    posArray[i + 2] = (Math.random() - 0.5) * 150;
}

const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(0xE6C300) },
    },
    vertexShader: `
        uniform float uTime;
        varying float vAlpha;

        void main() {
            vec3 newPos = position;

           float speed = 3.0 + fract(sin(position.x * 127.1 + position.z * 311.7)) * 0.5;
            float range = 80.0;

           float phase = fract(sin(position.x * 43.1 + position.z * 71.3) * 5321.7) * range;



          float t = mod(position.y + phase + uTime * speed, range) / range;
newPos.y = t * range - range * 0.5;

            newPos.x += sin(uTime * 0.3 + position.z * 0.1) * 1.5;
            newPos.z += cos(uTime * 0.2 + position.x * 0.9) * 1.0;

            vAlpha = 1.0 - t + 0.9;

            vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
            gl_PointSize = max(4.0, 900.0 * (1.0 / -mvPosition.z));
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;

        // Яркое ядро
        float core = exp(-d * 8.0) * 3.0;
        
        // Крестообразный блик — блёстка
        float sparkX = exp(-abs(uv.x) * 20.0) * exp(-abs(uv.y) * 3.0);
        float sparkY = exp(-abs(uv.y) * 20.0) * exp(-abs(uv.x) * 3.0);
        float spark = (sparkX + sparkY) * 2.0;

        float strength = core + spark;

        gl_FragColor = vec4(uColor * strength, clamp(strength * vAlpha, 0.0, 1.0));
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
});

const particlesMesh = new THREE.Points(particleGeometry, particleMaterial);

particlesMesh.renderOrder = 1;
scene.add(particlesMesh);

window.addEventListener("scroll", () => {
    if (scrollActions.length === 0) return;

    const clipDuration = scrollActions[0].getClip().duration;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = maxScroll > 0 ? scrollY / maxScroll : 0;
    targetScrollTime = scrollPercent * clipDuration;
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    if (scrollActions.length > 0) {
        currentScrollTime += (targetScrollTime - currentScrollTime) * 0.1;
        scrollActions.forEach((action) => {
            action.time = currentScrollTime;
            action.setEffectiveWeight(1.0);
        });
    }

    if (idleActions.length > 0) {
        const isScrolledDown = window.scrollY <= 0;
        idleActions.forEach((action) => {
            if (!isScrolledDown) {
                action.stop();
            } else {
                if (!action.isRunning()) {
                    action.reset();
                    action.play();
                }
            }
        });
    }

    const elapsedTime = clock.getElapsedTime();
    const activeCamera = blenderCamera ? blenderCamera : camera;



    if (!blenderCamera) {
        controls.update();
    }

    if (particlesMesh) {
        particleMaterial.uniforms.uTime.value = elapsedTime;

        const camPos = new THREE.Vector3();
        activeCamera.getWorldPosition(camPos);
        particlesMesh.position.x = camPos.x;
        particlesMesh.position.z = camPos.z;
    }
    renderer.render(scene, activeCamera);
}
animate();

window.addEventListener("resize", function () {
    const aspect = window.innerWidth / window.innerHeight;
    if (blenderCamera) {
        blenderCamera.aspect = aspect;
        blenderCamera.updateProjectionMatrix();
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});