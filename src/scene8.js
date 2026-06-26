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

// ---  ОСВЕЩЕНИЕ ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(10, 10, 10);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x90b0d0, 0.8);
fillLight.position.set(-10, 5, -15);
scene.add(fillLight);
// --------------------

let mixer;
let blenderCamera = null;

let scrollActions = [];
let idleActions = [];
let targetScrollTime = 0;
let currentScrollTime = 0;


let model;
let hitboxes = [];
const loader = new GLTFLoader();
loader.load("/model/eightm.gltf", function (glb) {
    model = glb.scene;
    scene.add(model);

    if (glb.cameras && glb.cameras.length > 0) {
        blenderCamera = glb.cameras[0];
        blenderCamera.aspect = window.innerWidth / window.innerHeight;
        blenderCamera.updateProjectionMatrix();
    }

    if (glb.animations && glb.animations.length > 0) {
        console.log("=== Список доступных анимаций в модели ===");
        glb.animations.forEach((anim, index) => {
            console.log(`[${index}] Имя: "${anim.name}" | Длительность: ${anim.duration.toFixed(2)} сек.`);
        });
        console.log("==========================================");

        mixer = new THREE.AnimationMixer(model);

        glb.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);

            if (clip.name === 'ScrolRingAnim') {

                action.blendMode = THREE.NormalBlending;
                action.play();
                action.paused = true;

                action.setEffectiveWeight(1.0);
                scrollActions.push(action);

            } else if (clip.name === 'IdleCloseTingAnimation') {
                const additiveClip = THREE.AnimationUtils.makeClipAdditive(clip);

                const action = mixer.clipAction(additiveClip);

                action.blendMode = THREE.AdditiveAnimationBlendMode;
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
        } 
        
        else if (child.name === "Cylinder_2" || child.name === "Cylinder_3" || child.name === "Cylinder_4") {
            const radius = Math.max(size.x, size.z) / 2;
            const tubeThickness = size.y / 2;
            
            
            hitboxGeo = new THREE.TorusGeometry(radius, tubeThickness, 8, 16);
        }
        else {
            
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
const mouselight = new THREE.PointLight(0x90b0d0, 200.0, 100);
scene.add(mouselight);

const lightHelper = new THREE.PointLightHelper(mouselight, 1);
scene.add(lightHelper);
const raycaster = new THREE.Raycaster();
let coor = new THREE.Vector2(0, 0);

window.addEventListener("mousemove", (e) => {
    if (!e) return;
    const rect = renderer.domElement.getBoundingClientRect();
    coor.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    coor.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});
window.addEventListener("scroll", () => {
    if (scrollActions.length == 0) {
        return;
    }
    const clipDuration = scrollActions[0].getClip().duration;
    const scrollY = window.scrollY;

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    const scrollPercent = maxScroll > 0 ? scrollY / maxScroll : 0;

    targetScrollTime = scrollPercent * clipDuration;
    console.log(`Прокрутка: ${scrollY}px | Процент: ${(scrollPercent * 100).toFixed(1)}%`);
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
    const isScrolledDown = targetScrollTime > 0.001 || currentScrollTime > 0.001;
    if (idleActions.length > 0) {
        idleActions.forEach((action) => {
            if (isScrolledDown) {
                action.setEffectiveWeight(0.0);
                action.stop();
            }
            else {
                if (!action.isRunning()) {
                    action.play();
                }
                action.setEffectiveWeight(1.0);
            }


        });
    }

    const activeCamera = blenderCamera ? blenderCamera : camera;
    if (hitboxes.length > 0) { 
        raycaster.setFromCamera(coor, activeCamera);
        
        const intersects = raycaster.intersectObjects(hitboxes, true);
        
        if (intersects.length > 0) {
            mouselight.position.copy(intersects[0].point);
            mouselight.position.addScaledVector(intersects[0].face.normal, 2.0);
        }
    }

    if (!blenderCamera) {
        controls.update();
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