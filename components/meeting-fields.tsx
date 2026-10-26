import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";

const t = strings.meetings;

export type MeetingDefaults = {
  meeting_date?: string;
  start_time?: string | null;
  topic?: string;
  details?: string | null;
  speaker_id?: string | null;
  class_id?: string | null;
};

/** Inputs for creating / editing a meeting (inside an ActionForm). */
export function MeetingFields({
  servants,
  classes,
  defaults = {},
}: {
  servants: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  defaults?: MeetingDefaults;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meeting_date">{t.date}</Label>
          <Input id="meeting_date" name="meeting_date" type="date" required defaultValue={defaults.meeting_date} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_time">{t.time}</Label>
          <Input id="start_time" name="start_time" type="time" defaultValue={defaults.start_time?.slice(0, 5) ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topic">{t.topic}</Label>
        <Input id="topic" name="topic" required placeholder={t.topicPlaceholder} defaultValue={defaults.topic} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details">{t.details}</Label>
        <Textarea
          id="details"
          name="details"
          rows={2}
          placeholder={t.detailsPlaceholder}
          defaultValue={defaults.details ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="speaker_id">{t.speakerLabel}</Label>
        <NativeSelect id="speaker_id" name="speaker_id" defaultValue={defaults.speaker_id ?? ""}>
          <option value="">{t.noSpeakerOption}</option>
          {servants.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="class_id">{t.audience}</Label>
        <NativeSelect id="class_id" name="class_id" defaultValue={defaults.class_id ?? ""}>
          <option value="">{strings.competitions.wholeService}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  );
}
