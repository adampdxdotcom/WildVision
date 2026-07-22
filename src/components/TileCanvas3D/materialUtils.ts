import { TileFinish } from '../../types';

export function getMaterialFinishProps(finish: TileFinish) {
  switch (finish) {
    case 'matte':
      return { roughness: 0.8, metalness: 0.02 };
    case 'glossy':
      return { roughness: 0.08, metalness: 0.05 };
    case 'satin':
    default:
      return { roughness: 0.3, metalness: 0.05 };
  }
}
