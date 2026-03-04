import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Create a circular particle texture
function createCircleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const center = size / 2
  const radius = size / 2

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function Particles({ count = 600 }) {
  const mesh = useRef<THREE.Points>(null!)
  const geometryRef = useRef<THREE.BufferGeometry>(null!)
  const circleTexture = useMemo(() => createCircleTexture(), [])

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const opacities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15
      opacities[i] = Math.random() * 0.5 + 0.2
    }
    return { positions, opacities }
  }, [count])

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3))
    }
  }, [particles])

  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.y = state.clock.elapsedTime * 0.015
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.008) * 0.08

    const posAttr = mesh.current.geometry.attributes.position
    if (posAttr) {
      const arr = posAttr.array as Float32Array
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        arr[i3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i * 0.05) * 0.002
        arr[i3] += Math.cos(state.clock.elapsedTime * 0.3 + i * 0.03) * 0.001
      }
      posAttr.needsUpdate = true
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        size={0.08}
        map={circleTexture}
        color="#7c7fff"
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function GlowOrb({ position, color, speed, size = 1.2 }: { position: [number, number, number]; color: string; speed: number; size?: number }) {
  const mesh = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.8
    mesh.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * speed * 0.6) * 0.5
    const s = size + Math.sin(state.clock.elapsedTime * speed * 1.5) * 0.15
    mesh.current.scale.setScalar(s)
  })

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} />
    </mesh>
  )
}

function ScrollReactive() {
  const { camera } = useThree()

  useFrame(() => {
    const scrollY = window.scrollY || 0
    camera.position.y = -(scrollY * 0.002)
    camera.position.z = 5 + scrollY * 0.001
  })

  return null
}

export default function ParticleField() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <ScrollReactive />
        <Particles />
        <GlowOrb position={[-4, 1, -3]} color="#6366f1" speed={0.4} size={1.5} />
        <GlowOrb position={[4, -1, -4]} color="#8b5cf6" speed={0.3} size={1.8} />
        <GlowOrb position={[0, 3, -5]} color="#a78bfa" speed={0.35} size={1.3} />
        <GlowOrb position={[-2, -2, -3]} color="#6366f1" speed={0.25} size={1.0} />
      </Canvas>
    </div>
  )
}
