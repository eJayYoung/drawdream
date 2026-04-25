'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Camera as LucideCamera, X, Plus, Trash2, Move } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface HumanFigure {
  id: string;
  mesh: THREE.Group;
  color: string;
  manuallyScaled?: boolean;
}

type PlaceMode = 'none' | 'green' | 'red';

interface PanoramaViewerProps {
  imageUrl: string;
  title?: string;
  onClose?: () => void;
  onScreenshot?: (blob: Blob) => void;
}

export function PanoramaViewer({ imageUrl, title = '360°全景图', onClose, onScreenshot }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const figuresRef = useRef<HumanFigure[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const selectedFigureIdRef = useRef<string | null>(null);
  const isMovingFigureRef = useRef(false);
  const clickedOnHandleRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [placeMode, setPlaceMode] = useState<PlaceMode>('none');
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(null);
  const prevSelectedFigureRef = useRef<string | null>(null);
  const [figures, setFigures] = useState<{ id: string; color: string }[]>([]);

  // 创建3D人形 - 缩小版本
  const createHumanFigure = useCallback((color: string, id: string): THREE.Group => {
    const group = new THREE.Group();
    group.userData.figureId = id;
    const scale = 5;

    const material = new THREE.MeshLambertMaterial({ color });

    const bodyGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 1.0 * scale, 16);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.y = 0.9 * scale;
    body.userData.isBody = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.y = 1.7 * scale;
    head.userData.isBody = true;
    group.add(head);

    const legGeometry = new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.8 * scale, 8);
    const leftLeg = new THREE.Mesh(legGeometry, material);
    leftLeg.position.set(-0.1 * scale, 0.0, 0);
    leftLeg.userData.isBody = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, material);
    rightLeg.position.set(0.1 * scale, 0.0, 0);
    rightLeg.userData.isBody = true;
    group.add(rightLeg);

    const armGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.6 * scale, 8);
    const leftArm = new THREE.Mesh(armGeometry, material);
    leftArm.position.set(-0.3 * scale, 0.9 * scale, 0);
    leftArm.userData.isBody = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, material);
    rightArm.position.set(0.3 * scale, 0.9 * scale, 0);
    rightArm.userData.isBody = true;
    group.add(rightArm);


    return group;
  }, []);

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 1.6, 0.1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = -0.5;
    controls.zoomSpeed = 1;
    controls.minDistance = 10;
    controls.maxDistance = 300;
    controls.target.set(0, 1.6, -1);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;
        setIsLoaded(true);
      },
      undefined,
      () => {
        const material = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;
        setIsLoaded(true);
      }
    );

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      // 选中人形时禁用缩放
      controls.enableZoom = !selectedFigureIdRef.current;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = false;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
        // 只有在拖动一定距离后才启用移动模式，且必须是点击了把手
        if (selectedFigureIdRef.current && clickedOnHandleRef.current) {
          isMovingFigureRef.current = true;
        }
      }

      // 移动选中的人形
      if (isMovingFigureRef.current && selectedFigureIdRef.current && containerRef.current && cameraRef.current && sceneRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        if (sphereRef.current) {
          const intersects = raycasterRef.current.intersectObject(sphereRef.current);
          if (intersects.length > 0) {
            const point = intersects[0].point;
            const direction = point.clone().normalize();
            const placeDistance = 50;

            const figure = figuresRef.current.find(f => f.id === selectedFigureIdRef.current);
            if (figure) {
              figure.mesh.position.copy(direction.multiplyScalar(placeDistance));
              // 根据距离调整大小 - 近大远小，但如果是手动缩放过的就不覆盖
              if (!figure.manuallyScaled) {
                const distanceToCamera = cameraRef.current!.position.distanceTo(figure.mesh.position);
                const scale = (distanceToCamera / 100) * 5;
                figure.mesh.scale.setScalar(scale);
              }
              figure.mesh.lookAt(new THREE.Vector3(0, figure.mesh.position.y, 0));
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      isMovingFigureRef.current = false;
      clickedOnHandleRef.current = false;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    // 滚轮事件：选中人形时缩放人形，否则用 OrbitControls
    const handleWheel = (e: WheelEvent) => {
      if (selectedFigureIdRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const figure = figuresRef.current.find(f => f.id === selectedFigureIdRef.current);
        if (figure) {
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          figure.mesh.scale.setScalar(figure.mesh.scale.x * delta);
          figure.manuallyScaled = true;
        }
      }
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
    };
  }, [imageUrl, createHumanFigure]);

  // 键盘事件
  // 点击场景
  const handleSceneClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current || !sphereRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // 检测是否点击了人形
    const figureMeshes: THREE.Object3D[] = [];
    figuresRef.current.forEach(f => {
      f.mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          figureMeshes.push(child);
        }
      });
    });

    const figureIntersects = raycasterRef.current.intersectObjects(figureMeshes, true);

    if (figureIntersects.length > 0) {
      const clickedObj = figureIntersects[0].object;

      // 找到被点击的人形
      let figureId: string | null = null;

      // 检查是否点击了人形身体
      if ((clickedObj as THREE.Mesh).userData?.isBody) {
        // 点击了身体
        let parent = clickedObj.parent;
        while (parent) {
          if ((parent as THREE.Group).userData?.figureId) {
            figureId = (parent as THREE.Group).userData.figureId;
            break;
          }
          parent = parent.parent;
        }
      }

      if (figureId) {
        console.log('[选中移动]', '人形', figureId);
        // 取消上一个选中效果
        if (prevSelectedFigureRef.current && prevSelectedFigureRef.current !== figureId) {
          setFigureSelected(prevSelectedFigureRef.current, false);
        }
        setSelectedFigureId(figureId);
        selectedFigureIdRef.current = figureId;
        prevSelectedFigureRef.current = figureId;
        clickedOnHandleRef.current = true;
        setFigureSelected(figureId, true);
        return;
      }
    }

    // 没有点击人形，且在放置模式
    if (placeMode !== 'none' && !isDraggingRef.current) {
      console.log('[放置检查] placeMode:', placeMode, 'isDragging:', isDraggingRef.current);
      const intersects = raycasterRef.current.intersectObject(sphereRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const hexColor = placeMode === 'green' ? '#00ff00' : '#ff0000';
        const id = `figure-${Date.now()}`;
        const humanGroup = createHumanFigure(hexColor, id);
        const direction = point.clone().normalize();
        const placeDistance = 50;
        humanGroup.position.copy(direction.multiplyScalar(placeDistance));
        // 根据距离调整大小 - 近大远小
        const distanceToCamera = cameraRef.current!.position.distanceTo(humanGroup.position);
        const scale = (distanceToCamera / 100) * 5;
        humanGroup.scale.setScalar(scale);
        humanGroup.lookAt(new THREE.Vector3(0, humanGroup.position.y, 0));

        sceneRef.current!.add(humanGroup);
        // 防止重复添加
        const figureExists = figuresRef.current.some(f => f.id === id);
        if (!figureExists) {
          console.log('[放置新人形]', id, hexColor);
          figuresRef.current.push({ id, mesh: humanGroup, color: hexColor });
          setFigures(prev => [...prev, { id, color: hexColor }]);
          // 放置后退出放置模式
          setPlaceMode('none');
        }
      }
    } else if (!isDraggingRef.current) {
      // 点击空白处，取消选中
      if (prevSelectedFigureRef.current) {
        setFigureSelected(prevSelectedFigureRef.current, false);
        prevSelectedFigureRef.current = null;
      }
      setSelectedFigureId(null);
      selectedFigureIdRef.current = null;
      clickedOnHandleRef.current = false;
    }
  }, [placeMode, createHumanFigure]);

  // 设置人形选中/取消选中效果
  const setFigureSelected = useCallback((figureId: string, selected: boolean) => {
    const figure = figuresRef.current.find(f => f.id === figureId);
    if (!figure) return;
    figure.mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.isBody) {
        const mat = child.material as THREE.MeshLambertMaterial;
        if (selected) {
          mat.emissive = new THREE.Color(0x4488ff);
          mat.emissiveIntensity = 0.4;
        } else {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    });
  }, []);

  // 放大选中人形
  const scaleUpSelected = useCallback(() => {
    if (selectedFigureIdRef.current) {
      const figure = figuresRef.current.find(f => f.id === selectedFigureIdRef.current);
      if (figure) {
        figure.mesh.scale.setScalar(figure.mesh.scale.x * 1.2);
        figure.manuallyScaled = true;
      }
    }
  }, []);

  // 缩小选中人形
  const scaleDownSelected = useCallback(() => {
    if (selectedFigureIdRef.current) {
      const figure = figuresRef.current.find(f => f.id === selectedFigureIdRef.current);
      if (figure) {
        figure.mesh.scale.setScalar(figure.mesh.scale.x / 1.2);
        figure.manuallyScaled = true;
      }
    }
  }, []);

  // 键盘事件 - +/- 缩放选中人形
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlaceMode('none');
        if (prevSelectedFigureRef.current) {
          setFigureSelected(prevSelectedFigureRef.current, false);
          prevSelectedFigureRef.current = null;
        }
        setSelectedFigureId(null);
        selectedFigureIdRef.current = null;
      }
      // 选中人形时，+/- 调整大小
      if (selectedFigureIdRef.current) {
        if (e.key === '+' || e.key === '=') {
          scaleUpSelected();
        } else if (e.key === '-') {
          scaleDownSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scaleUpSelected, scaleDownSelected]);

  // 删除人形
  const deleteFigure = useCallback((id: string) => {
    const index = figuresRef.current.findIndex(f => f.id === id);
    if (index !== -1) {
      sceneRef.current?.remove(figuresRef.current[index].mesh);
      figuresRef.current.splice(index, 1);
      setFigures(prev => prev.filter(f => f.id !== id));
      if (selectedFigureIdRef.current === id) {
        selectedFigureIdRef.current = null;
        prevSelectedFigureRef.current = null;
        setSelectedFigureId(null);
      }
    }
  }, []);

  // 截图
  const handleScreenshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    try {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const canvas = rendererRef.current.domElement;
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (onScreenshot) {
          onScreenshot(blob);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('[截图] 失败:', error);
    }
  }, [onScreenshot]);

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* 头部 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-black/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{title}</span>
          {!isLoaded && <span className="text-xs text-white/50">加载中...</span>}
          {placeMode !== 'none' && (
            <span className="text-xs text-yellow-400">
              放置模式: 点击场景放置{placeMode === 'green' ? '绿色' : '红色'}人
            </span>
          )}
          {selectedFigureId && placeMode === 'none' && (
            <span className="text-xs text-blue-400">
              已选中人形，拖动移动 | 点击其他取消选中
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onScreenshot && (
            <button
              onClick={handleScreenshot}
              disabled={!isLoaded}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <LucideCamera size={14} />
              截图
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            <X size={14} />
            关闭
          </button>
        </div>
      </div>

      {/* 左侧工具栏 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        <button
          onClick={() => {
            setPlaceMode(placeMode === 'green' ? 'none' : 'green');
            setSelectedFigureId(null);
          }}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white transition-all ${
            placeMode === 'green' ? 'bg-green-500 ring-2 ring-white' : 'bg-green-500/50 hover:bg-green-500/70'
          }`}
        >
          <Plus size={14} />
          绿色
        </button>
        <button
          onClick={() => {
            setPlaceMode(placeMode === 'red' ? 'none' : 'red');
            setSelectedFigureId(null);
          }}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white transition-all ${
            placeMode === 'red' ? 'bg-red-500 ring-2 ring-white' : 'bg-red-500/50 hover:bg-red-500/70'
          }`}
        >
          <Plus size={14} />
          红色
        </button>
      </div>

      {/* 右侧人形列表 */}
      {figures.length > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-lg p-2 max-h-[50vh] overflow-auto">
          <div className="text-xs text-white/50 mb-2">已放置 ({figures.length})</div>
          {figures.map((fig) => (
            <div
              key={fig.id}
              className={`flex items-center gap-2 mb-1 p-1 rounded ${
                selectedFigureId === fig.id ? 'bg-white/20' : ''
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fig.color }} />
              <span className="text-xs text-white">人形</span>
              <button
                onClick={() => deleteFigure(fig.id)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <Trash2 size={12} className="text-white/70" />
              </button>
            </div>
          ))}
          {/* 选中人形的缩放控制 */}
          {selectedFigureId && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <div className="text-xs text-white/50 mb-1">选中人形</div>
              <div className="flex gap-1">
                <button
                  onClick={scaleDownSelected}
                  className="flex-1 rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                >
                  缩小
                </button>
                <button
                  onClick={scaleUpSelected}
                  className="flex-1 rounded bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
                >
                  放大
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Three.js 画布 */}
      <div
        ref={containerRef}
        className="absolute inset-0 pt-14 pb-8"
        onClick={handleSceneClick}
        tabIndex={0}
      />

      {/* 底部提示 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center bg-black/50 px-4 py-2">
        <div className="text-xs text-white/70">
          点击白色球拖动移动人 | 点击人选中 | +/- 缩放 | 拖动旋转视角 | 滚轮缩放 | 左侧按钮放置 | ESC 取消
        </div>
      </div>
    </div>
  );
}