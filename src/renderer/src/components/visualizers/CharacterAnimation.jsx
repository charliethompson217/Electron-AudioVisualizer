/*
A free online tool to visualize audio files with spectrogram, waveform, MIDI conversion and more.
Copyright (C) 2024 Charles Thompson

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const getResourcePath = (resource) => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  return isDev ? `/${resource}` : window.electron.ipcRenderer.sendSync('get-resource-path', resource);
};

export default function CharacterAnimation({ isPlaying, dataFromPython }) {
  const mountRef = useRef(null);
  const mixerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const animationsRef = useRef(null);
  const currentActionRef = useRef(null);
  const [emotion, setEmotion] = useState('idle');

  function emotionName(data) {
    switch (data) {
      case 'Happy / Excited':
        return 'Happy';
      case 'Intense / Powerful':
        return 'Excited';
      case 'Angry / Tense':
        return 'angry';
      case 'Calm / Peaceful':
        return 'calm';
      case 'Sad':
        return 'sad';
      case 'Neutral':
        return 'idle';
      default:
        return 'idle';
    }
  }

  useEffect(() => {
    const emo = isPlaying && dataFromPython?.emotion ? emotionName(dataFromPython.emotion) : 'idle';
    setEmotion(emo);
  }, [dataFromPython, isPlaying]);

  useEffect(() => {
    const container = mountRef.current;
    const width = 300;
    const height = 400;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);

    new RGBELoader().load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      sceneRef.current.environment = texture;
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 10, 7.5);
    sceneRef.current.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;

    const glbPath = getResourcePath('animations/CharacterAnimation.glb');
    const loader = new GLTFLoader();
    loader.load(
      glbPath,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        sceneRef.current.add(model);

        animationsRef.current = gltf.animations;
        mixerRef.current = new THREE.AnimationMixer(model);

        const idleClip = gltf.animations.find((anim) => anim.name.toLowerCase() === 'idle');
        if (idleClip) {
          const idleAction = mixerRef.current.clipAction(idleClip);
          idleAction.setLoop(THREE.LoopRepeat);
          idleAction.play();
          currentActionRef.current = idleAction;
        } else {
          console.warn('Idle animation not found');
        }

        const updateModelScale = () => {
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const scaleX = width / size.x;
          const scaleY = height / size.y;
          const scale = Math.min(scaleX, scaleY) * 0.9;

          model.scale.set(scale, scale, scale);
          model.position.set(0, 0, 0);
          model.position.sub(center.multiplyScalar(scale));

          const maxDim = Math.max(size.x, size.y, size.z) * scale;
          camera.position.set(0, (size.y * scale) / 2, maxDim * 0.8);
          camera.lookAt(0, 0, 0);
          controls.target.set(0, 0, 0);
        };

        updateModelScale();
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      },
      undefined,
      (error) => console.error('An error occurred loading the GLB:', error)
    );

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      if (mixerRef.current) mixerRef.current.update(clock.getDelta());
      controls.update();
      renderer.render(sceneRef.current, camera);
    };
    animate();

    return () => {
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      if (modelRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              Array.isArray(child.material) ? child.material.forEach((mat) => mat.dispose()) : child.material.dispose();
            }
          }
        });
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!mixerRef.current || !animationsRef.current || !emotion) return;

    const clip = animationsRef.current.find((anim) => anim.name.toLowerCase() === emotion.toLowerCase());

    if (!clip) {
      console.warn(`No animation found for emotion: ${emotion}`);
      return;
    }

    if (currentActionRef.current && currentActionRef.current.getClip().name !== clip.name) {
      currentActionRef.current.fadeOut(0.5);
      const action = mixerRef.current.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopRepeat);
      action.fadeIn(0.5);
      action.play();
      currentActionRef.current = action;
    }
  }, [emotion]);

  return (
    <div
      style={{
        width: '300px',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={mountRef}
        style={{
          width: '300px',
          height: '400px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid white',
        }}
      />
    </div>
  );
}
