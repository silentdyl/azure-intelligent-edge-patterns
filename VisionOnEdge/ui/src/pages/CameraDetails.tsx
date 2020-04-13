import React, { FC } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Grid } from '@fluentui/react-northstar';
import CameraDetailInfo from '../components/CameraDetails/CameraDetailInfo';

import { State } from '../store/State';
import { Camera } from '../store/camera/cameraTypes';
import { CameraConfigureInfo, CreateCameraConfig } from '../components/CameraConfigure';

const CameraDetails: FC = (): JSX.Element => {
  const { name, projectId } = useParams();
  const camera = useSelector<State, Camera>((state) => state.cameras.find((e) => e.name === name));

  const hasProject = !!projectId;

  return (
    <Grid columns="2" design={{ height: '100%' }}>
      <CameraDetailInfo name={name} rtsp={camera.rtsp} modelName={camera.model_name} />
      {hasProject ? <CameraConfigureInfo /> : <CreateCameraConfig />}
    </Grid>
  );
};

export default CameraDetails;
