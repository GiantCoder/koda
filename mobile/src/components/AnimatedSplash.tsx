import React, { useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import Svg, { Path, Circle, Rect, Defs, ClipPath, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/** Exact path data from public/koda.svg -- the real brand mark, unaltered. */
const K_PATH =
  "M29.403 100C27.723 100 26.283 99.44 25.083 98.32C23.963 97.12 23.403 95.64 23.403 93.88V17.32C23.403 15.56 23.963 14.12 25.083 13C26.283 11.8 27.723 11.2 29.403 11.2C31.163 11.2 32.603 11.8 33.723 13C34.843 14.12 35.403 15.56 35.403 17.32V93.88C35.403 95.64 34.843 97.12 33.723 98.32C32.603 99.44 31.163 100 29.403 100ZM68.523 36.64C70.043 36.64 71.363 37.28 72.483 38.56C73.603 39.84 74.163 41.12 74.163 42.4C74.163 44 73.403 45.48 71.883 46.84L34.323 80.44L33.843 66.64L64.083 38.56C65.363 37.28 66.843 36.64 68.523 36.64ZM69.963 99.88C68.283 99.88 66.843 99.2 65.643 97.84L41.643 72.52L50.763 64.12L74.163 89.44C75.443 90.8 76.083 92.32 76.083 94C76.083 95.76 75.363 97.2 73.923 98.32C72.563 99.36 71.243 99.88 69.963 99.88Z";

/** The 5 accent dots, in the order the "bowled ball" visits them: released
 * off-screen, first bounce at the top of the upper arm, second bounce at
 * the stroke junction, then out to the two bottom ends. Matches the real
 * mark's dot positions exactly -- nothing invented, just re-sequenced into
 * a bowling delivery. */
const DOTS: { cx: number; cy: number; delay: number }[] = [
  { cx: 67.75, cy: 43, delay: 0 }, // first bounce
  { cx: 29.5, cy: 71.5, delay: 220 }, // second bounce (stroke junction)
  { cx: 29.5, cy: 93.5, delay: 380 },
  { cx: 69.5, cy: 93.5, delay: 460 },
  { cx: 29.5, cy: 17.5, delay: 560 },
];

const BALL_PATH: { x: number; y: number }[] = [
  { x: -18, y: -30 }, // released, off-screen upper-left
  { x: 67.75, y: 43 }, // first bounce
  { x: 29.5, y: 71.5 }, // second bounce
  { x: 69.5, y: 93.5 }, // settle
];

interface AnimatedSplashProps {
  onFinish: () => void;
}

/**
 * Cold-launch intro: a bowled ball arcs in and "bounces" its way down the
 * koda.svg K mark (revealed via a top-to-bottom wipe timed to the ball's
 * descent, plus the 5 real accent dots stamping in as landing marks),
 * then the "oda Cricket" wordmark fades in alongside it to complete
 * "Koda Cricket". Shown once, between the native splash screen and the
 * real app -- see src/app/_layout.tsx.
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const { width: winWidth } = useWindowDimensions();
  const markSize = Math.min(120, winWidth * 0.28);

  const reveal = useSharedValue(0); // 0..109, clip rect height in mark's own viewBox units
  const ballX = useSharedValue(BALL_PATH[0].x);
  const ballY = useSharedValue(BALL_PATH[0].y);
  const ballScale = useSharedValue(0.4);
  // One shared value per dot, named explicitly rather than built with
  // `DOTS.map(() => useSharedValue(...))` -- hooks must be called the same
  // way on every render, and looping to create them (even over a
  // fixed-length constant array) fights that convention.
  const dotScale0 = useSharedValue(0);
  const dotScale1 = useSharedValue(0);
  const dotScale2 = useSharedValue(0);
  const dotScale3 = useSharedValue(0);
  const dotScale4 = useSharedValue(0);
  const dotScales = [dotScale0, dotScale1, dotScale2, dotScale3, dotScale4];
  const markScale = useSharedValue(1);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslate = useSharedValue(8);

  useEffect(() => {
    // Ball "delivery": swings in from off-screen, bounces at the two
    // marked points, settles at the bottom of the lower arm.
    ballScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    ballX.value = withSequence(
      withTiming(BALL_PATH[1].x, { duration: 380, easing: Easing.out(Easing.cubic) }),
      withTiming(BALL_PATH[2].x, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      withTiming(BALL_PATH[3].x, { duration: 260, easing: Easing.in(Easing.quad) })
    );
    ballY.value = withSequence(
      withTiming(BALL_PATH[1].y, { duration: 380, easing: Easing.out(Easing.cubic) }),
      withTiming(BALL_PATH[2].y - 10, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(BALL_PATH[2].y, { duration: 160, easing: Easing.in(Easing.quad) }),
      withTiming(BALL_PATH[3].y - 8, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(BALL_PATH[3].y, { duration: 120, easing: Easing.in(Easing.quad) })
    );

    // K mark wipes in top-to-bottom in sync with the ball's descent.
    reveal.value = withDelay(120, withTiming(109, { duration: 820, easing: Easing.out(Easing.cubic) }));

    // Ball fades out once it's done "bowling" the letter.
    ballScale.value = withDelay(960, withTiming(0, { duration: 180 }));

    // Seam-mark dots stamp in as the ball passes each point.
    dotScales.forEach((dot, i) => {
      dot.value = withDelay(
        120 + DOTS[i].delay,
        withSequence(
          withSpring(1.25, { damping: 6, stiffness: 260 }),
          withSpring(1, { damping: 8, stiffness: 220 })
        )
      );
    });

    // Mark settles, then the rest of the wordmark reveals.
    markScale.value = withDelay(1050, withSequence(withTiming(1.06, { duration: 140 }), withTiming(1, { duration: 160 })));
    wordmarkOpacity.value = withDelay(1250, withTiming(1, { duration: 300 }));
    wordmarkTranslate.value = withDelay(1250, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      runOnJS(onFinish)();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clipRectProps = useAnimatedProps(() => ({ height: reveal.value }));
  const ballProps = useAnimatedProps(() => ({
    cx: ballX.value,
    cy: ballY.value,
    r: 5.5 * ballScale.value,
    opacity: ballScale.value > 0.05 ? 1 : 0,
  }));
  const dotAnimatedProps0 = useAnimatedProps(() => ({ r: 4.5 * dotScale0.value }));
  const dotAnimatedProps1 = useAnimatedProps(() => ({ r: 4.5 * dotScale1.value }));
  const dotAnimatedProps2 = useAnimatedProps(() => ({ r: 4.5 * dotScale2.value }));
  const dotAnimatedProps3 = useAnimatedProps(() => ({ r: 4.5 * dotScale3.value }));
  const dotAnimatedProps4 = useAnimatedProps(() => ({ r: 4.5 * dotScale4.value }));
  const dotAnimatedProps = [
    dotAnimatedProps0,
    dotAnimatedProps1,
    dotAnimatedProps2,
    dotAnimatedProps3,
    dotAnimatedProps4,
  ];
  const markAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: markScale.value }],
  }));
  const wordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateX: wordmarkTranslate.value }],
  }));

  return (
    <View
      className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark"
      pointerEvents="none"
    >
      <View className="flex-row items-center">
        <Animated.View style={[{ width: markSize, height: markSize * (109 / 95) }, markAnimatedStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 95 109">
            <Defs>
              <ClipPath id="reveal">
                <AnimatedRect x={0} y={0} width={95} animatedProps={clipRectProps} />
              </ClipPath>
            </Defs>
            <AnimatedG clipPath="url(#reveal)">
              <Path d={K_PATH} fill="#3C3C3C" />
              {DOTS.map((d, i) => (
                <AnimatedCircle
                  key={`${d.cx}-${d.cy}`}
                  cx={d.cx}
                  cy={d.cy}
                  fill="#B61212"
                  animatedProps={dotAnimatedProps[i]}
                />
              ))}
            </AnimatedG>
            <AnimatedCircle fill="#B61212" animatedProps={ballProps} />
          </Svg>
        </Animated.View>

        <Animated.View style={wordmarkAnimatedStyle}>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: markSize * 0.42, fontWeight: "700", marginLeft: -markSize * 0.06 }}
          >
            oda Cricket
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
