import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Colors, withOpacity } from "@/constants/theme";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export default function TabsLayout() {
  const { t } = useAppTranslation();
  return (
    <NativeTabs
      backgroundColor={Colors.background}
      tintColor={Colors.primary}
      iconColor={{
        default: Colors.textSecondary,
        selected: Colors.primary,
      }}
      labelStyle={{
        default: {
          color: Colors.textSecondary,
          fontSize: 11,
          fontWeight: "600",
        },
        selected: {
          color: Colors.primary,
          fontSize: 11,
          fontWeight: "600",
        },
      }}
      indicatorColor={withOpacity(Colors.primary, 0.1)}
      rippleColor={withOpacity(Colors.surface, 0.3)}
      {...({
        contentStyle: {
          paddingVertical: 8,
        },
      } as any)}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("common.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <NativeTabs.Trigger.Label>
          {t("common.inventory")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="archivebox" md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="kitchen">
        <NativeTabs.Trigger.Label>
          {t("common.kitchen")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>
          {t("common.settings")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
