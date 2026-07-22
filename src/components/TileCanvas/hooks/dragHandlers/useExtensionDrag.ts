import { WallExtension } from '../../../../types';

interface UseExtensionDragArgs {
  wallWidth: number;
  wallHeight: number;
  wallExtensions: WallExtension[];
  setWallExtensions: (val: WallExtension[] | ((prev: WallExtension[]) => WallExtension[])) => void;
}

export const useExtensionDrag = ({
  wallWidth,
  wallHeight,
  wallExtensions,
  setWallExtensions,
}: UseExtensionDragArgs) => {

  const handleExtensionDrag = (
    draggingExtensionId: string,
    deltaX: number,
    deltaY: number,
    extStartPos: { x: number; y: number },
    isFreeform: boolean = false
  ) => {
    const currentExt = wallExtensions.find((e) => e.id === draggingExtensionId);
    if (!currentExt) return;

    let newX = extStartPos.x + deltaX;
    let newY = extStartPos.y + deltaY;

    const shapeWidth = currentExt.width;
    const shapeHeight = currentExt.height;
    const snapTolerance = 4;

    let snapX: number | null = null;

    if (!isFreeform) {
      if (Math.abs(newX - wallWidth) <= snapTolerance) {
        snapX = wallWidth;
      } else if (Math.abs(newX + shapeWidth - 0) <= snapTolerance) {
        snapX = -shapeWidth;
      } else if (Math.abs(newX - 0) <= snapTolerance) {
        snapX = 0;
      } else if (Math.abs(newX - (wallWidth - shapeWidth)) <= snapTolerance) {
        snapX = wallWidth - shapeWidth;
      } else if (Math.abs(newX + shapeWidth / 2 - wallWidth / 2) <= snapTolerance) {
        snapX = wallWidth / 2 - shapeWidth / 2;
      }
    }

    if (snapX !== null) {
      newX = snapX;
    }

    let snapY: number | null = null;

    if (!isFreeform) {
      if (Math.abs(newY - wallHeight) <= snapTolerance) {
        snapY = wallHeight;
      } else if (Math.abs(newY + shapeHeight - 0) <= snapTolerance) {
        snapY = -shapeHeight;
      } else if (Math.abs(newY - 0) <= snapTolerance) {
        snapY = 0;
      } else if (Math.abs(newY - (wallHeight - shapeHeight)) <= snapTolerance) {
        snapY = wallHeight - shapeHeight;
      } else if (Math.abs(newY + shapeHeight / 2 - wallHeight / 2) <= snapTolerance) {
        snapY = wallHeight / 2 - shapeHeight / 2;
      }
    }

    if (snapY !== null) {
      newY = snapY;
    }

    wallExtensions.forEach((otherExt) => {
      if (otherExt.id === draggingExtensionId) return;

      const isCurOval = currentExt.boundaryShape === 'oval';
      const isCurArch = currentExt.boundaryShape === 'arch';
      const curAd = currentExt.archDirection;
      const isOthOval = otherExt.boundaryShape === 'oval';
      const isOthArch = otherExt.boundaryShape === 'arch';
      const othAd = otherExt.archDirection;

      const othLeft = otherExt.x;
      const othRight = otherExt.x + otherExt.width;
      const othBottom = otherExt.y;
      const othTop = otherExt.y + otherExt.height;

      const canSnapCurLeft = !isCurOval && !(isCurArch && curAd === 'left');
      const canSnapCurRight = !isCurOval && !(isCurArch && curAd === 'right');
      const canSnapCurBottom = !isCurOval && !(isCurArch && curAd === 'bottom');
      const canSnapCurTop = !isCurOval && !(isCurArch && curAd === 'top');

      const canSnapOthLeft = !isOthOval && !(isOthArch && othAd === 'left');
      const canSnapOthRight = !isOthOval && !(isOthArch && othAd === 'right');
      const canSnapOthBottom = !isOthOval && !(isOthArch && othAd === 'bottom');
      const canSnapOthTop = !isOthOval && !(isOthArch && othAd === 'top');

      if (snapX === null) {
        if (canSnapCurLeft && canSnapOthLeft && Math.abs(newX - othLeft) <= snapTolerance) {
          newX = ThermalSnapOrVal(newX, othLeft);
        } else if (canSnapCurLeft && canSnapOthRight && Math.abs(newX - othRight) <= snapTolerance) {
          newX = ThermalSnapOrVal(newX, othRight);
        } else if (canSnapCurRight && canSnapOthLeft && Math.abs(newX + shapeWidth - othLeft) <= snapTolerance) {
          newX = ThermalSnapOrVal(newX, othLeft - shapeWidth);
        } else if (canSnapCurRight && canSnapOthRight && Math.abs(newX + shapeWidth - othRight) <= snapTolerance) {
          newX = ThermalSnapOrVal(newX, othRight - shapeWidth);
        }
      }

      if (snapY === null) {
        if (canSnapCurBottom && canSnapOthBottom && Math.abs(newY - othBottom) <= snapTolerance) {
          newY = ThermalSnapOrVal(newY, othBottom);
        } else if (canSnapCurBottom && canSnapOthTop && Math.abs(newY - othTop) <= snapTolerance) {
          newY = ThermalSnapOrVal(newY, othTop);
        } else if (canSnapCurTop && canSnapOthBottom && Math.abs(newY + shapeHeight - othBottom) <= snapTolerance) {
          newY = ThermalSnapOrVal(newY, othBottom - shapeHeight);
        } else if (canSnapCurTop && canSnapOthTop && Math.abs(newY + shapeHeight - othTop) <= snapTolerance) {
          newY = ThermalSnapOrVal(newY, othTop - shapeHeight);
        }
      }
    });

    setWallExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === draggingExtensionId) {
          return {
            ...ext,
            x: Number(newX.toFixed(2)),
            y: Number(newY.toFixed(2)),
          };
        }
        return ext;
      })
    );
  };

  return { handleExtensionDrag };
};

function ThermalSnapOrVal(val: number, snapTarget: number): number {
  return snapTarget;
}
