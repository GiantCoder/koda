import React from "react";
import { Modal, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";

interface FullScreenModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

/**
 * RN Modal renders in a new native window, so SafeAreaView inside it often
 * sees 0 top inset and the header (Close) ends up under the status bar.
 * Read insets from the parent provider and pad the sheet ourselves.
 */
export function FullScreenModal({ visible, onRequestClose, children }: FullScreenModalProps) {
  const insets = useSafeAreaInsets();
  const fallback = initialWindowMetrics?.insets;
  const paddingTop = insets.top || fallback?.top || 0;
  const paddingBottom = insets.bottom || fallback?.bottom || 0;
  const paddingLeft = insets.left || fallback?.left || 0;
  const paddingRight = insets.right || fallback?.right || 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <View
        className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark"
        style={{
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        }}
      >
        {children}
      </View>
    </Modal>
  );
}
