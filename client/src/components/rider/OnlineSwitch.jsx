import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Switch from "@/components/common/Switch";

// The big Online / Offline switch at the top of the rider home [AC-RIDER-03].
// isOnline: the server's answer; isWorking: a change is being sent; onToggle(): flip it
const OnlineSwitch = ({ isOnline, isWorking, onToggle }) => {
  return (
    <Card
      tone={isOnline ? "highlight" : "default"}
      padding="lg"
      className="flex items-center justify-between gap-4"
    >
      <div>
        <Text className="text-lg font-bold">{isOnline ? "You're online" : "You're offline"}</Text>
        <Text muted className="text-[15px]">
          {isOnline ? "Delivery offers will pop up here" : "Go online to get delivery offers"}
        </Text>
      </div>

      <Switch checked={isOnline} onChange={onToggle} label="Online" disabled={isWorking} />
    </Card>
  );
};

export default OnlineSwitch;
