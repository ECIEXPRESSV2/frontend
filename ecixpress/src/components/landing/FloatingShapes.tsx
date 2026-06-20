import React from 'react';

interface FloatingShapeProps {
  type?: 'circle' | 'square' | 'diamond';
  size?: number;
  color?: string;
  opacity?: number;
  blur?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'center-left' | 'center-right' | 'center';
  animation?: 'pulse' | 'spin' | 'float' | 'none';
  animationDuration?: string;
  animationDelay?: string;
  className?: string;
}

const FloatingShape: React.FC<FloatingShapeProps> = ({
  type = 'circle',
  size = 20,
  color = 'rgba(251, 191, 36, 0.2)',
  opacity = 1,
  blur = 0,
  position = 'top-left',
  animation = 'pulse',
  animationDuration = '3s',
  animationDelay = '0s',
  className = '',
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: '10%', left: '10%' };
      case 'top-right':
        return { top: '10%', right: '10%' };
      case 'bottom-left':
        return { bottom: '10%', left: '10%' };
      case 'bottom-right':
        return { bottom: '10%', right: '10%' };
      case 'top-center':
        return { top: '10%', left: '50%' };
      case 'bottom-center':
        return { bottom: '10%', left: '50%' };
      case 'center-left':
        return { top: '50%', left: '10%' };
      case 'center-right':
        return { top: '50%', right: '10%' };
      case 'center':
        return { top: '50%', left: '50%' };
      default:
        return { top: '10%', left: '10%' };
    }
  };

  const getShapeStyles = () => {
    const baseStyles = {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      opacity,
      filter: blur > 0 ? `blur(${blur}px)` : 'none',
    };

    if (type === 'circle') {
      return { ...baseStyles, borderRadius: '50%' };
    } else if (type === 'diamond') {
      return { ...baseStyles };
    }

    return baseStyles;
  };

  const getTransform = () => {
    let transforms = [];

    // Add shape-specific transform
    if (type === 'diamond') {
      transforms.push('rotate(45deg)');
    }

    // Add position-specific transform
    switch (position) {
      case 'top-center':
        transforms.push('translateX(-50%)');
        break;
      case 'bottom-center':
        transforms.push('translateX(-50%)');
        break;
      case 'center-left':
        transforms.push('translateY(-50%)');
        break;
      case 'center-right':
        transforms.push('translateY(-50%)');
        break;
      case 'center':
        transforms.push('translate(-50%, -50%)');
        break;
    }

    return transforms.length > 0 ? { transform: transforms.join(' ') } : {};
  };

  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'spin':
        return 'animate-spin';
      case 'float':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const animationStyle = animation !== 'none' ? {
    animationDuration,
    animationDelay,
  } : {};

  return (
    <div
      className={`absolute pointer-events-none ${getAnimationClass()} ${className}`}
      style={{
        ...getPositionStyles(),
        ...getShapeStyles(),
        ...getTransform(),
        ...animationStyle,
      }}
    />
  );
};

export default FloatingShape;
