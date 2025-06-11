import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { OBJLoader } from "jsm/loaders/OBJLoader.js";
import getSun from "./src/getSun.js";
import getNebula from "./src/getNebula.js";
import getStarfield from "./src/getStarfield.js";
import getPlanet from "./src/getplanet.js";
import getAsteroidBelt from "./src/getAsteroidBelt.js";
import getElipticLines from "./src/getElipticLines.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 2.5, 4);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true});
// scene.overrideMaterial = wireMat;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Global variables for planet speed control
const planetSpeedControls = {
  mercury: 1.0,
  venus: 1.0,
  earth: 1.0,
  mars: 1.0,
  jupiter: 1.0,
  saturn: 1.0,
  uranus: 1.0,
  neptune: 1.0
};

// Exposed functions for external control
window.setPlanetSpeed = function(planetName, speed) {
  if (planetSpeedControls.hasOwnProperty(planetName.toLowerCase())) {
    planetSpeedControls[planetName.toLowerCase()] = Math.max(0, speed);
    console.log(`${planetName} speed set to: ${speed}`);
  } else {
    console.warn(`Planet "${planetName}" not found. Available planets:`, Object.keys(planetSpeedControls));
  }
};

window.getPlanetSpeed = function(planetName) {
  return planetSpeedControls[planetName.toLowerCase()] || null;
};

window.resetPlanetSpeed = function(planetName) {
  if (planetName === 'all') {
    Object.keys(planetSpeedControls).forEach(planet => {
      planetSpeedControls[planet] = 1.0;
    });
    console.log('All planet speeds reset to 1.0');
  } else if (planetSpeedControls.hasOwnProperty(planetName.toLowerCase())) {
    planetSpeedControls[planetName.toLowerCase()] = 1.0;
    console.log(`${planetName} speed reset to 1.0`);
  }
};

window.pausePlanet = function(planetName) {
  if (planetName === 'all') {
    Object.keys(planetSpeedControls).forEach(planet => {
      planetSpeedControls[planet] = 0;
    });
    console.log('All planets paused');
  } else {
    setPlanetSpeed(planetName, 0);
  }
};

window.listPlanetSpeeds = function() {
  console.log('Current planet speeds:', planetSpeedControls);
  return planetSpeedControls;
};

// Modified getPlanet function wrapper to add speed control
function createPlanetWithSpeedControl(config, planetName) {
  const planet = getPlanet(config);
  
  // Store original update function
  const originalUpdate = planet.userData.update;
  
  // Override update function to include speed control
  planet.userData.update = function(t) {
    const speedMultiplier = planetSpeedControls[planetName.toLowerCase()] || 1.0;
    
    if (originalUpdate) {
      // If getPlanet already has an update function, modify the time parameter
      originalUpdate.call(this, t * speedMultiplier);
    } else {
      // If no original update function, create basic orbital motion
      if (!this.userData.angle) this.userData.angle = Math.random() * Math.PI * 2;
      if (!this.userData.distance) this.userData.distance = config.distance;
      
      this.userData.angle += (t * 0.5 / this.userData.distance) * speedMultiplier;
      this.position.x = Math.cos(this.userData.angle) * this.userData.distance;
      this.position.z = Math.sin(this.userData.angle) * this.userData.distance;
    }
  };
  
  // Store planet name for identification
  planet.userData.planetName = planetName;
  
  return planet;
}

function initScene(data) {
  const { objs } = data;
  const solarSystem = new THREE.Group();
  solarSystem.userData.update = (t) => {
    solarSystem.children.forEach((child) => {
      child.userData.update?.(t);
    });
  };
  scene.add(solarSystem);

  const sun = getSun();
  solarSystem.add(sun);

  // Create planets with speed control
  const mercury = createPlanetWithSpeedControl(
    { size: 0.1, distance: 1.25, img: 'mercury.png' }, 
    'mercury'
  );
  solarSystem.add(mercury);

  const venus = createPlanetWithSpeedControl(
    { size: 0.2, distance: 1.65, img: 'venus.png' }, 
    'venus'
  );
  solarSystem.add(venus);

  const moon = getPlanet({ size: 0.075, distance: 0.4, img: 'moon.png' });
  const earth = createPlanetWithSpeedControl(
    { children: [moon], size: 0.225, distance: 2.0, img: 'earth.png' }, 
    'earth'
  );
  solarSystem.add(earth);

  const mars = createPlanetWithSpeedControl(
    { size: 0.15, distance: 2.25, img: 'mars.png' }, 
    'mars'
  );
  solarSystem.add(mars);

  const asteroidBelt = getAsteroidBelt(objs);
  solarSystem.add(asteroidBelt);

  const jupiter = createPlanetWithSpeedControl(
    { size: 0.4, distance: 2.75, img: 'jupiter.png' }, 
    'jupiter'
  );
  solarSystem.add(jupiter);

  const sRingGeo = new THREE.TorusGeometry(0.6, 0.15, 8, 64);
  const sRingMat = new THREE.MeshStandardMaterial();
  const saturnRing = new THREE.Mesh(sRingGeo, sRingMat);
  saturnRing.scale.z = 0.1;
  saturnRing.rotation.x = Math.PI * 0.5;
  const saturn = createPlanetWithSpeedControl(
    { children: [saturnRing], size: 0.35, distance: 3.25, img: 'saturn.png' }, 
    'saturn'
  );
  solarSystem.add(saturn);

  const uRingGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 64);
  const uRingMat = new THREE.MeshStandardMaterial();
  const uranusRing = new THREE.Mesh(uRingGeo, uRingMat);
  uranusRing.scale.z = 0.1;
  const uranus = createPlanetWithSpeedControl(
    { children: [uranusRing], size: 0.3, distance: 3.75, img: 'uranus.png' }, 
    'uranus'
  );
  solarSystem.add(uranus);

  const neptune = createPlanetWithSpeedControl(
    { size: 0.3, distance: 4.25, img: 'neptune.png' }, 
    'neptune'
  );
  solarSystem.add(neptune);

  const elipticLines = getElipticLines();
  solarSystem.add(elipticLines);

  const starfield = getStarfield({ numStars: 500, size: 0.35 });
  scene.add(starfield);

  const dirLight = new THREE.DirectionalLight(0x0099ff, 1);
  dirLight.position.set(0, 1, 0);
  scene.add(dirLight);

  const nebula = getNebula({
    hue: 0.6,
    numSprites: 10,
    opacity: 0.2,
    radius: 40,
    size: 80,
    z: -50.5,
  });
  scene.add(nebula);

  const anotherNebula = getNebula({
    hue: 0.0,
    numSprites: 10,
    opacity: 0.2,
    radius: 40,
    size: 80,
    z: 50.5,
  });
  scene.add(anotherNebula);

//   // Console instructions for users
//   console.log(`
// 🌍 Solar System Speed Controls Available:

// Usage Examples:
// • setPlanetSpeed('earth', 2.0)     - Double Earth's orbital speed
// • setPlanetSpeed('mars', 0.5)      - Half Mars's orbital speed  
// • setPlanetSpeed('jupiter', 0)     - Stop Jupiter
// • resetPlanetSpeed('earth')        - Reset Earth to normal speed
// • resetPlanetSpeed('all')          - Reset all planets
// • pausePlanet('venus')             - Pause Venus
// • pausePlanet('all')               - Pause all planets
// • getPlanetSpeed('saturn')         - Get Saturn's current speed
// • listPlanetSpeeds()               - Show all current speeds

// Available planets: ${Object.keys(planetSpeedControls).join(', ')}
//   `);
  
  function animate(t = 0) {
    const time = t * 0.0005;
    requestAnimationFrame(animate);
    solarSystem.userData.update(time);
    renderer.render(scene, camera);
    controls.update();
  }

  animate();
}

const sceneData = {
  objs: [],
};
const manager = new THREE.LoadingManager();
manager.onLoad = () => initScene(sceneData);
const loader = new OBJLoader(manager);
const objs = ['Rock1', 'Rock2', 'Rock3'];
objs.forEach((name) => {
  let path = `./rocks/${name}.obj`;
  loader.load(path, (obj) => {
    obj.traverse((child) => {
      if (child.isMesh) {
        sceneData.objs.push(child);
      }
    });
  });
});



function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);