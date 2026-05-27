'use client'

import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Edges, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

interface BoxViewer3DProps {
  length: number
  width: number
  height: number
}

function BoxMesh({ length, width, height }: BoxViewer3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Normalize sizes to fit nicely in the view
  const max = Math.max(length, width, height, 1)
  const scale = 3
  const sL = (length / max) * scale
  const sW = (width / max) * scale
  const sH = (height / max) * scale

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <group position={[0, sH / 2, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[sL, sH, sW]} />
        <meshStandardMaterial 
          color="#8a6e50" 
          roughness={0.9} 
          metalness={0.1}
          envMapIntensity={0.5}
        />
        <Edges scale={1} threshold={15} color="#523f2d" />
      </mesh>
    </group>
  )
}

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}

export default function BoxViewer3D({ length, width, height }: BoxViewer3DProps) {
  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Suspense fallback={<Loader />}>
        <Canvas shadows camera={{ position: [5, 4, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" />
          
          <BoxMesh length={length} width={width} height={height} />
          
          <ContactShadows 
            position={[0, 0, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
            far={10} 
            resolution={256} 
            color="#000000" 
          />
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={2} 
            maxDistance={10}
            maxPolarAngle={Math.PI / 2 + 0.1}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
