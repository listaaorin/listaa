import React from 'react';
import { View } from 'react-native';
import Svg, { Text, Defs, LinearGradient, Stop } from 'react-native-svg';

type LogoSize = 'xl' | 'large' | 'medium' | 'small';

const SIZE_MAP: Record<LogoSize, { fontSize: number; width: number; height: number }> = {
  xl:     { fontSize: 64, width: 280, height: 80 },
  large:  { fontSize: 48, width: 210, height: 62 },
  medium: { fontSize: 34, width: 150, height: 46 },
  small:  { fontSize: 22, width: 100, height: 32 },
};

interface Props {
  size?: LogoSize;
  style?: object;
}

export default function ListaaLogo({ size = 'large', style }: Props) {
  const { fontSize, width, height } = SIZE_MAP[size];

  return (
    <View style={style}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`logoGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor="#7B2D8B" />
            <Stop offset="55%"  stopColor="#A0237A" />
            <Stop offset="100%" stopColor="#C2185B" />
          </LinearGradient>
        </Defs>
        <Text
          fill={`url(#logoGrad-${size})`}
          fontSize={fontSize}
          fontFamily="Georgia"
          fontWeight="normal"
          x="2"
          y={fontSize}
        >
          Listaa.
        </Text>
      </Svg>
    </View>
  );
}
