/**
 * ArcTrack — The signature visual of Listaa.
 * Renders a curved arc (like a rainbow) from "Open" to "Done".
 * The assigned user's avatar sits ON the arc at their current status position.
 */
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
} from 'react-native-svg';
import { Colors, Spacing } from '../../lib/theme';
import { LoopStatus } from '../../lib/types';

const SCREEN_W   = Dimensions.get('window').width;
const ARC_W      = SCREEN_W - Spacing.lg * 2;
const ARC_H      = 120;
const PAD_X      = 16;      // horizontal inset for arc endpoints
const CTRL_Y     = 8;       // control point Y (how high the arc peaks)
const AVATAR_R   = 20;      // avatar circle radius

// Quadratic Bezier endpoints and control point
const P0: [number, number] = [PAD_X,       ARC_H - 20];
const P1: [number, number] = [ARC_W / 2,   CTRL_Y];
const P2: [number, number] = [ARC_W - PAD_X, ARC_H - 20];

/** Compute point on quadratic bezier at t ∈ [0,1] */
function bezier(t: number): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * P0[0] + 2 * mt * t * P1[0] + t * t * P2[0],
    y: mt * mt * P0[1] + 2 * mt * t * P1[1] + t * t * P2[1],
  };
}

const STATUS_T: Record<LoopStatus, number> = {
  open:        0.05,
  in_progress: 0.50,
  closed:      0.95,
};

// Ring colors for assignee avatars
const RING_COLORS = ['#F5A623', '#C2185B', '#7B2D8B', '#1565C0', '#2E7D32'];

interface Props {
  title: string;
  deadline?: string;
  status: LoopStatus;
  ownerAvatarUrl?: string;
  ownerName?: string;
  ownerColorIndex?: number;
}

export default function ArcTrack({
  title,
  deadline,
  status,
  ownerAvatarUrl,
  ownerName,
  ownerColorIndex = 0,
}: Props) {
  const t     = STATUS_T[status];
  const pt    = bezier(t);
  const ringColor = RING_COLORS[ownerColorIndex % RING_COLORS.length];

  const dueLabel = deadline
    ? `Due: ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
    : 'Due: None';

  const arcPath = `M ${P0[0]},${P0[1]} Q ${P1[0]},${P1[1]} ${P2[0]},${P2[1]}`;

  const statusLabel =
    status === 'open'        ? 'Open'
    : status === 'in_progress' ? 'In Progress'
    : 'Done';

  return (
    <View style={styles.wrapper}>
      {/* Status label above arc */}
      <Text style={styles.statusLabel}>{statusLabel}</Text>

      {/* SVG arc */}
      <View style={styles.svgContainer}>
        <Svg width={ARC_W} height={ARC_H}>
          <Defs>
            <LinearGradient id={`grad-${title.slice(0,8)}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor="#7B2D8B" />
              <Stop offset="100%" stopColor="#C2185B" />
            </LinearGradient>
          </Defs>

          {/* Main arc line */}
          <Path
            d={arcPath}
            stroke={`url(#grad-${title.slice(0,8)})`}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* Endpoint dots */}
          <SvgCircle cx={P0[0]} cy={P0[1]} r={5} fill={Colors.surface} stroke="#7B2D8B" strokeWidth={2} />
          <SvgCircle cx={P2[0]} cy={P2[1]} r={5} fill={Colors.surface} stroke="#C2185B" strokeWidth={2} />
        </Svg>

        {/* Avatar positioned on the arc */}
        <View
          style={[
            styles.avatarContainer,
            {
              left:  pt.x - AVATAR_R,
              top:   pt.y - AVATAR_R,
              borderColor: ringColor,
            },
          ]}
        >
          {ownerAvatarUrl ? (
            <Image source={{ uri: ownerAvatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: ringColor }]}>
              <Text style={styles.avatarInitial}>
                {(ownerName ?? '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Title + Due date */}
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.due}>{dueLabel}</Text>
      </View>

      {/* Open / Done labels */}
      <View style={styles.endLabels}>
        <Text style={styles.endLabel}>Open</Text>
        <Text style={styles.endLabel}>Done</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 0,
  },
  svgContainer: {
    width: ARC_W,
    height: ARC_H,
    position: 'relative',
  },
  avatarContainer: {
    position: 'absolute',
    width:  AVATAR_R * 2,
    height: AVATAR_R * 2,
    borderRadius: AVATAR_R,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  avatarImg: {
    width:  AVATAR_R * 2,
    height: AVATAR_R * 2,
    borderRadius: AVATAR_R,
  },
  avatarFallback: {
    width:  AVATAR_R * 2,
    height: AVATAR_R * 2,
    borderRadius: AVATAR_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    alignItems: 'center',
    marginTop: -Spacing.sm,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  due: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: PAD_X - 4,
  },
  endLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
