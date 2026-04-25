'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const NAMESPACE = '/generation';

export interface GenerationProgressPayload {
  taskId: string;
  episodeId?: string;
  storyboardId?: string;
  status: string;
  progress: number;
  outputResult?: Record<string, unknown> & { comfyAssetIds?: string[] };
  error?: string;
}

export interface TaskUpdatePayload {
  taskId: string;
  status: string;
  progress?: number;
  outputs?: Record<string, unknown>;
}

type SocketStatus = 'disconnected' | 'connecting' | 'connected';

interface UseSocketIOOptions {
  userId: string;
  projectId?: string;
  onGenerationProgress?: (data: GenerationProgressPayload) => void;
  onTaskUpdate?: (data: TaskUpdatePayload) => void;
}

interface UseSocketIOReturn {
  status: SocketStatus;
  isConnected: boolean;
  subscribeProject: (projectId: string) => void;
  unsubscribeProject: (projectId: string) => void;
}

/**
 * Hook that provides a shared Socket.IO connection for the generation namespace.
 * Manages connection lifecycle, authentication, and project room subscriptions.
 *
 * Call subscribeProject / unsubscribeProject manually if projectId is not provided at init.
 */
export function useSocketIO({
  userId,
  projectId,
  onGenerationProgress,
  onTaskUpdate,
}: UseSocketIOOptions): UseSocketIOReturn {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const onGenerationProgressRef = useRef(onGenerationProgress);
  const onTaskUpdateRef = useRef(onTaskUpdate);

  // Keep refs current so effect doesn't need to re-run on every callback change
  onGenerationProgressRef.current = onGenerationProgress;
  onTaskUpdateRef.current = onTaskUpdate;

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${SOCKET_URL}${NAMESPACE}`, {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connecting');
      socket.emit('auth', { userId });
      if (projectId) {
        socket.emit('subscribe_project', { projectId });
      }
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('generation_progress', (data: GenerationProgressPayload) => {
      onGenerationProgressRef.current?.(data);
    });

    socket.on('task_update', (data: TaskUpdatePayload) => {
      onTaskUpdateRef.current?.(data);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
    // Only run once on mount/unmount; userId is the stable identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handle projectId change after initial connect
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || status !== 'connected' || !projectId) return;
    socket.emit('subscribe_project', { projectId });
  }, [projectId, status]);

  const subscribeProject = useCallback((pid: string) => {
    const socket = socketRef.current;
    if (!socket || status !== 'connected') return;
    socket.emit('subscribe_project', { projectId: pid });
  }, [status]);

  const unsubscribeProject = useCallback((pid: string) => {
    const socket = socketRef.current;
    if (!socket || status !== 'connected') return;
    socket.emit('unsubscribe_project', { projectId: pid });
  }, [status]);

  return {
    status,
    isConnected: status === 'connected',
    subscribeProject,
    unsubscribeProject,
  };
}
