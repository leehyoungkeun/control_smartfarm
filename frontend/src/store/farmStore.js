/**
 * 농장 목록 스토어 (Zustand)
 * 사용자가 접근 가능한 농장 목록 관리
 */
import { create } from 'zustand';

const useFarmStore = create((set) => ({
  farms: [],
  selectedFarm: null,
  loading: false,

  setFarms: (farms) => set({ farms }),
  setSelectedFarm: (farm) => set({ selectedFarm: farm }),
  setLoading: (loading) => set({ loading }),
}));

export default useFarmStore;
