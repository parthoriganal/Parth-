import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film.jsx';
import {defaultProject,dimensions,totalFrames} from '../shared/project.js';
const initial=defaultProject();
export default function Root(){return <Composition id="Film" component={Film} durationInFrames={totalFrames(initial)} fps={initial.fps} width={1920} height={1080} defaultProps={{project:initial,assetUrls:{},includeAudio:false}} calculateMetadata={({props})=>({...dimensions(props.project),fps:props.project.fps,durationInFrames:totalFrames(props.project)})}/>;}
