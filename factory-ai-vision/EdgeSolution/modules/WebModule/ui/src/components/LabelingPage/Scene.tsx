import React, { FC, useState, useEffect, useCallback, useRef, Dispatch, useMemo } from 'react';
import { Button, CloseIcon } from '@fluentui/react-northstar';
import { Stage, Layer, Image, Group, Text as KonvaText, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/types/Node';
import { useDispatch } from 'react-redux';

import useImage from './util/useImage';
import getResizeImageFunction from './util/resizeImage';
import { Box2d } from './Box';
import {
  Size2D,
  Annotation,
  WorkState,
  LabelingType,
  LabelingCursorStates,
} from '../../store/labelingPage/labelingPageTypes';
import {
  createAnnotation,
  updateCreatingAnnotation,
  removeAnnotation,
} from '../../store/labelingPage/labelingPageActions';
import RemoveBoxButton from './RemoveBoxButton';

const defaultSize: Size2D = {
  width: 800,
  height: 600,
};

interface SceneProps {
  url?: string;
  partName: string;
  labelingType: LabelingType;
  annotations: Annotation[];
  workState: WorkState;
  setWorkState: Dispatch<WorkState>;
  onBoxCreated?: () => void;
}
const Scene: FC<SceneProps> = ({
  url = '',
  partName,
  labelingType,
  annotations,
  workState,
  setWorkState,
  onBoxCreated,
}) => {
  const dispatch = useDispatch();
  const resizeImage = useCallback(getResizeImageFunction(defaultSize), [defaultSize]);
  const [imageSize, setImageSize] = useState<Size2D>(defaultSize);
  const noMoreCreate = useMemo(
    () => labelingType === LabelingType.SingleAnnotation && annotations.length === 1,
    [labelingType, annotations],
  );
  const [cursorState, setCursorState] = useState<LabelingCursorStates>(LabelingCursorStates.default);
  const [image, status, size] = useImage(url, 'anonymous');
  const [selectedAnnotationIndex, setSelectedAnnotationIndex] = useState<number>(null);
  const [showOuterRemoveButton, setShowOuterRemoveButton] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const scale = useRef<number>(1);
  const changeCursorState = useCallback(
    (cursorType?: LabelingCursorStates): void => {
      if (!cursorType) {
        if (noMoreCreate) {
          setCursorState(LabelingCursorStates.default);
        } else {
          setCursorState(LabelingCursorStates.crosshair);
        }
      } else {
        setCursorState(cursorType);
      }
    },
    [noMoreCreate],
  );
  const removeBox = useCallback((): void => {
    dispatch(removeAnnotation(selectedAnnotationIndex));
    setWorkState(WorkState.None);
    setShowOuterRemoveButton(false);
  }, [dispatch, selectedAnnotationIndex, setWorkState, setShowOuterRemoveButton]);
  const onMouseDown = (e: KonvaEventObject<MouseEvent>): void => {
    // * Single bounding box labeling type condition
    if (noMoreCreate || workState === WorkState.Creating) return;

    dispatch(createAnnotation({ x: e.evt.offsetX / scale.current, y: e.evt.offsetY / scale.current }));
    setSelectedAnnotationIndex(annotations.length - 1);
    setWorkState(WorkState.Creating);
  };

  const onMouseUp = (e: KonvaEventObject<MouseEvent>): void => {
    if (workState === WorkState.Creating) {
      dispatch(
        updateCreatingAnnotation({ x: e.evt.offsetX / scale.current, y: e.evt.offsetY / scale.current }),
      );
      if (annotations.length - 1 === selectedAnnotationIndex) {
        setWorkState(WorkState.Selecting);
        if (onBoxCreated) onBoxCreated();
      } else {
        setWorkState(WorkState.None);
      }
    }
  };

  const onSelect = (index: number): void => {
    setSelectedAnnotationIndex(index);
    setWorkState(WorkState.Selecting);
  };

  useEffect(() => {
    // * Single bounding box labeling type condition
    if (noMoreCreate) {
      changeCursorState();
      setSelectedAnnotationIndex(0);
    } else {
      changeCursorState();
    }
  }, [noMoreCreate, changeCursorState]);
  useEffect(() => {
    if (workState === WorkState.None && !noMoreCreate) setSelectedAnnotationIndex(null);
  }, [workState, noMoreCreate]);
  useEffect(() => {
    const [outcomeSize, outcomeScale] = resizeImage(size);
    setImageSize(outcomeSize);
    scale.current = outcomeScale;
  }, [size, resizeImage]);

  const isLoading = status === 'loading' || (imageSize.height === 0 && imageSize.width === 0);

  return (
    <div style={{ margin: '0.2em' }}>
      {annotations.length !== 0 &&
      showOuterRemoveButton &&
      !isDragging &&
      workState !== WorkState.Creating ? (
        <Button
          iconOnly
          text
          styles={{ color: '#F9526B', ':hover': { color: '#E73550' } }}
          content={<CloseIcon size="large" />}
          onClick={removeBox}
        />
      ) : (
        <div style={{ height: '2em' }} />
      )}
      <Stage
        width={imageSize.width}
        height={imageSize.height}
        scale={{ x: scale.current, y: scale.current }}
        style={{ cursor: cursorState }}
      >
        <Layer
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onDragStart={(): void => {
            setIsDragging(true);
          }}
          onDragEnd={(): void => {
            setIsDragging(false);
          }}
        >
          <Image image={image} />
          {!isLoading &&
            annotations.map((annotation, i) => (
              <Group key={i}>
                <RemoveBoxButton
                  imageSize={imageSize}
                  visible={!isDragging && workState !== WorkState.Creating && i === selectedAnnotationIndex}
                  label={annotation.label}
                  scale={scale.current}
                  changeCursorState={changeCursorState}
                  setShowOuterRemoveButton={setShowOuterRemoveButton}
                  removeBox={removeBox}
                />
                <Box2d
                  workState={workState}
                  onSelect={onSelect}
                  annotation={annotation}
                  scale={scale.current}
                  annotationIndex={i}
                  selected={i === selectedAnnotationIndex}
                  dispatch={dispatch}
                  changeCursorState={changeCursorState}
                />
                <Text
                  x={annotation.label.x1}
                  y={annotation.label.y1 - 25 / scale.current}
                  fontSize={20 / scale.current}
                  fill="red"
                  text={partName}
                />
              </Group>
            ))}
          {isLoading && (
            <KonvaText
              x={imageSize.width / 2 - 50}
              y={imageSize.height / 2 - 25}
              fontSize={50}
              text="Loading..."
              fill="rgb(255, 0, 0)"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default Scene;
