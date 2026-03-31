import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

const NAVIGATION_GIFS = [
  require('../assets/gifs/chronos_nexus_toggle.gif'),
  require('../assets/gifs/focus_mode_scrub.gif'),
  require('../assets/gifs/capture_flow.gif'),
  require('../assets/gifs/bottom_tab_physics.gif'),
];

/**
 * Pre-warms the app by caching heavy GIFs and animations in memory.
 * This prevents the "black screen" decoding lag during the first render.
 */
export async function preloadNavigationAssets() {
  try {
    const assetPromises = NAVIGATION_GIFS.map(gif => Asset.fromModule(gif).downloadAsync());
    const imagePromises = NAVIGATION_GIFS.map(gif => {
      // expo-image prefetch for memory caching
      const uri = Asset.fromModule(gif).uri;
      return Image.prefetch(uri);
    });

    await Promise.all([...assetPromises, ...imagePromises]);
  } catch (error) {
    console.warn('Drift Asset Loader: Warning pre-fetching assets', error);
  }
}
