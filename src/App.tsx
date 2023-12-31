import { PerspectiveCamera, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import * as Scrollytelling from "@bsmnt/scrollytelling";

//Array of points
const points = [
  [10, 89, 0],
  [50, 88, 10],
  [76, 139, 20],
  [126, 141, 12],
  [150, 112, 8],
  [157, 73, 0],
  [180, 44, 5],
  [207, 35, 10],
  [232, 36, 0],
];

const getPointsPath = () => {
  const vectors = [];

  //Convert the array of points into vertices
  for (let i = 0; i < points.length; i++) {
    const x = points[i][0];
    const y = points[i][2];
    const z = points[i][1];
    vectors[i] = new THREE.Vector3(x, y, z);
  }
  //Create a path from the points
  const path = new THREE.CatmullRomCurve3(vectors);
  //path.curveType = 'catmullrom';
  path.tension = 0.5;

  return path;
};

let p1, p2;
const tubePath = getPointsPath();
const progress = { value: 0 };

const Tube = () => {
  const materialRef = React.useRef<THREE.ShaderMaterial>();
  const texture = useTexture("/texture.png");

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += 0.01;
    }
  });

  return (
    <mesh>
      <tubeGeometry args={[tubePath, 300, 4, 64, false]} />

      <shaderMaterial
        side={THREE.BackSide}
        transparent
        uniforms={{
          uTexture: {
            value: texture,
          },
          uTime: {
            value: 0,
          },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            vUv = uv;
          }
        `}
        fragmentShader={`
          vec2 rotateUV(vec2 uv, vec2 pivot, float angle) {
            vec2 offset = uv - pivot;
            float s = sin(angle);
            float c = cos(angle);
            vec2 rotatedOffset = vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);
            return rotatedOffset + pivot;
          }

          vec2 invertUV(vec2 uv, bool invertX, bool invertY) {
            if (invertX) {
              uv.x = 1.0 - uv.x;
            }
            if (invertY) {
              uv.y = 1.0 - uv.y;
            }
            return uv;
          }

          vec4 invertColor(vec4 color) {
            return vec4(1.0 - color.rgb, color.a);
          }

          varying vec2 vUv;

          uniform sampler2D uTexture;
          uniform float uTime;

          void main() {
            vec4 color = vec4(1.0, 0.0, 0.0, 1.0);

            float time = uTime;
            vec2 uv = vUv; 
            vec2 repeat = vec2(3.0, 128.0);

            uv = invertUV(uv, false, true);
            uv = rotateUV(uv, vec2(0.5, 0.5), radians(90.0));
            uv.x += sin((uv.y * 15.0) + time) * 0.15;
            uv = fract(uv * repeat);

            color = texture2D(uTexture, uv);

            color = invertColor(color);

            gl_FragColor = color;
          }
        `}
        ref={(ref: THREE.ShaderMaterial) => (materialRef.current = ref)}
      />
    </mesh>
  );
};

export default function App() {
  const camRef = React.useRef<THREE.PerspectiveCamera>();

  const update = React.useCallback(
    (p: number) => {
      if (!camRef.current) return;

      const lookAtOffset = 0.01;

      const progress = THREE.MathUtils.mapLinear(p, 0, 1, 0, 1 - lookAtOffset);

      p1 = tubePath.getPointAt(progress);
      p2 = tubePath.getPointAt(progress + lookAtOffset);

      camRef.current.position.copy(p1);
      camRef.current.lookAt(p2);
    },
    [camRef]
  );

  return (
    <Scrollytelling.Root start="top top" end="bottom bottom" scrub={2} debug>
      <div style={{ height: "1000vh" }}>
        <div
          style={{
            height: "100vh",
            width: "100%",
            position: "fixed",
            top: 0,
            left: 0,
          }}
        >
          <Canvas>
            <Scrollytelling.Animation
              tween={{
                start: 0,
                end: 100,
                target: progress,
                to: {
                  value: 1,
                  onUpdate: () => update(progress.value),
                },
              }}
            />

            <PerspectiveCamera
              position={[0, 0, 20]}
              makeDefault
              ref={(ref: THREE.PerspectiveCamera) => {
                if (!ref) return;

                if (camRef) {
                  camRef.current = ref;
                }
                update(0);
              }}
            />

            <color args={["black"]} attach="background" />

            <Stars radius={300} depth={100} count={5000} factor={10} />

            <Tube />
          </Canvas>
        </div>
      </div>
    </Scrollytelling.Root>
  );
}
