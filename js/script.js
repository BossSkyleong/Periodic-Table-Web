import * as THREE from 'three';
import * as TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { setupLogin, logout } from './login.js';

const CONFIG = {
    sheet_id: '1-za4pAykyJx7jO1ujRG9fvQDzgdaa8lxwrWaoEBbMj4',
    sheet_range: 'Sheet1',
    table_cols: 20,
    table_rows: 10,
    grid_x: 5,
    grid_y: 4,
    grid_z: 10,

    spacing_x: 140,
    spacing_y: 180,
    spacing_z: 400,

    low_max: 100000,
    high_min: 200000
};

let camera, scene, renderer, controls;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
let people = [];
const tmpVector = new THREE.Vector3();

async function loadSheet(token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheet_id}/values/${encodeURIComponent(CONFIG.sheet_range)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Sheets API error ${res.status}`);

    const rows = (await res.json()).values || [];
    if (!rows.length) return [];

    const header = rows[0].map(h => h.trim());
    return rows.slice(1)
        .filter(r => r[0] && r[0].trim() !== '')
        .map(r => {
            const obj = {};
            header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
            return normalizeRow(obj);
        });
}

function normalizeRow(raw) {
    const netWorth = Number(String(raw['Net Worth'] || '0').replace(/[^0-9.-]/g, '')) || 0;
    return {
        name: raw['Name'] || '',
        photo: raw['Photo'] || '',
        age: raw['Age'] || '',
        country: raw['Country'] || '',
        interest: raw['Interest'] || '',
        netWorth
    };
}

function init() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 0, 4000);
    scene = new THREE.Scene();

    people.forEach((p, idx) => {
        const el = buildTile(p, idx + 1);
        const obj = new CSS3DObject(el);

        obj.position.set(
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000
        );
        scene.add(obj);
        objects.push(obj);
    });

    computeTable();
    computeSphere();
    computeHelix();
    computeGrid();

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 1000;
    controls.maxDistance = 15000;
    controls.addEventListener('change', render);

    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    transform(targets.table, 2000);

    window.addEventListener('resize', onWindowResize);
}

function buildTile(p, index) {
    const el = document.createElement('div');
    el.className = 'element';

    
    const colorRGBA = getColorRGBA(p.netWorth);
    el.style.backgroundColor = colorRGBA;
    el.style.border = `1px solid ${colorRGBA.replace(/[\d.]+\)$/, '1)')}`;


    const topRow = document.createElement('div');
    topRow.className = 'top-row';

    
    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = index;
    topRow.appendChild(number);

    const country = document.createElement('div');
    country.className = 'country';
    country.textContent = p.country;
    topRow.appendChild(country);

    el.appendChild(topRow);

    
    const img = document.createElement('img');
    img.className = 'photo'
    img.src = p.photo;
    el.appendChild(img);

    
    const details = document.createElement('div');
    details.className = 'details';
    
    const firstName = p.name.split(' ')[0];
    details.innerHTML = `<strong>${escapeHtml(firstName)}</strong><br>${escapeHtml(p.interest)}`;
    
    el.appendChild(details);

    return el;
}


function getColorRGBA(nw) {
    if (nw < CONFIG.low_max) return 'rgba(239, 48, 34, 0.83)';   
    if (nw < CONFIG.high_min) return 'rgba(249, 200, 53, 0.81)'; 
    return 'rgba(58, 159, 72, 0.77)';                            
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
        switch (m) {
            case '&':  return '&amp;';
            case '<':  return '&lt;';
            case '>':  return '&gt;';
            case '"':  return '&quot;';
            case "'":  return '&#39;';
            default:   return m;
        }
    });
}

function computeTable() {
    const cols = CONFIG.table_cols;
    const rows = CONFIG.table_rows;
    const sx = CONFIG.spacing_x;
    const sy = CONFIG.spacing_y;

    const offsetX = (cols - 1) * sx / 2;
    const offsetY = (rows - 1) * sy / 2;

    people.forEach((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const o = new THREE.Object3D();
        o.position.set(col * sx - offsetX, - (row * sy) + offsetY, 0);
        targets.table.push(o);
    });
}

function computeSphere() {
    const l = objects.length; 
    for (let i = 0; i < l; i++) {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;
        const o = new THREE.Object3D();
        o.position.setFromSphericalCoords(1600, phi, theta);
        tmpVector.copy(o.position).multiplyScalar(2);
        o.lookAt(tmpVector);
        targets.sphere.push(o);
    }
}

function computeHelix() {
    const l = objects.length;
    const pairs = Math.ceil(l / 2);
    const radius = 900;
    const yStep = -16;
    const yOffset = 60
    const angleStep = 0.22;

    for (let i = 0; i < l; i++) {
        const strand = i % 2;
        const idx = Math.floor(i / 2);
        const theta = idx * angleStep + Math.PI + (strand ? Math.PI : 0);
        const y = (idx - (pairs - 1) / 2) * yStep + yOffset;
        
        const o = new THREE.Object3D();
        o.position.setFromCylindricalCoords(radius, theta, y);
        tmpVector.set(o.position.x * 2, o.position.y, o.position.z * 2);
        o.lookAt(tmpVector);
        targets.helix.push(o);
    }
}

function computeGrid() {
    const nx = CONFIG.grid_x;
    const ny = CONFIG.grid_y;
    const nz = CONFIG.grid_z;
    const sx = CONFIG.spacing_x * 1.2;
    const sy = CONFIG.spacing_y * 1.2;
    const sz = CONFIG.spacing_z;

    const offsetX = (nx - 1) * sx / 2;
    const offsetY = (ny - 1) * sy / 2;
    const offsetZ = (nz - 1) * sz / 2;

    people.forEach((_, i) => {
        const x = i % nx;
        const y = Math.floor(i / nx) % ny;
        const z = Math.floor(i / (nx * ny)) % nz;

        const o = new THREE.Object3D();
        o.position.set(
            x * sx - offsetX,
            -(y * sy) + offsetY,
            z * sz - offsetZ
        );
        targets.grid.push(o);
    });
}

function transform(targets, duration) {
    TWEEN.removeAll();

    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targets[i];
        if (!target) continue;

        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}

setupLogin(async (token) => {
    people = await loadSheet(token);
    if (!people.length) throw new Error('The sheet has no data rows');
    document.getElementById('login').style.display = 'none';
    init();
    animate();
    document.getElementById('logout').addEventListener('click', logout);
})