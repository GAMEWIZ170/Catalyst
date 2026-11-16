import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Share2, UserMinus, UserPlus } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Popover } from "@astryxdesign/core/Popover";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { api } from "../../api/client";
import Avatar from "../../components/profile/Avatar";
import AstryxTheme from "../../components/astryx/AstryxTheme";
import ClickToEdit from "../../components/astryx/ClickToEdit";
import SettingRow from "../../components/astryx/SettingRow";
import { useToast } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";
import "../../styles/settings-astryx.css";

const icon = (Icon) => <Icon size={18} aria-hidden="true" />;

// Friends: your code as a chip with copy and share, "Add friend" in a small popover, and the friends list first.
// Other students only ever see a display name and an avatar. Nobody can look students up by name.
export default function Friends() {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => (params.get("code") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase()); // from an invite link
  const [adding, setAdding] = useState(Boolean(params.get("code")));
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getFriends()
      .then(({ data }) => setState({ loading: false, error: "", data }))
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  }, []);
  useEffect(load, [load]);

  // Runs one change, then reloads the lists. A failure is shown at the top of the page.
  async function run(action, success) {
    setBusy(true);
    setProblem("");
    try {
      const response = await action();
      if (success) toast({ tone: "success", message: response?.message || success });
      load();
      return true;
    } catch (error) {
      setProblem(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addFriend() {
    if (await run(() => api.sendFriendRequest(code.trim()), t("friends.sent"))) { setCode(""); setAdding(false); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.data.me.code);
      toast({ tone: "success", message: t("friends.copied") });
    } catch {
      toast({ tone: "warning", message: t("friends.copyFailed") });
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/s/i/${state.data.me.code}`;
    try {
      if (navigator.share) await navigator.share({ title: t("friends.inviteTitle"), text: t("friends.inviteText"), url });
      else { await navigator.clipboard.writeText(url); toast({ tone: "success", message: "Invite link copied" }); }
    } catch (error) {
      if (error?.name !== "AbortError") toast({ tone: "warning", message: t("friends.copyFailed") });
    }
  }

  if (state.loading && !state.data) return <div className="content student-page"><Loading /></div>;
  if (state.error && !state.data) return <div className="content student-page"><ErrorState message={state.error} onRetry={load} /></div>;
  const { me, friends, incoming, outgoing } = state.data;
  const person = (item) => <Avatar avatar={item.avatar} name={item.name} size={36} />;

  return <AstryxTheme>
    <div className="content student-page friends-astryx">
      <VStack gap={5}>
        <HStack justify="between" align="center" wrap="wrap" gap={3}>
          <VStack gap={1}>
            <Heading level={1}>{t("friends.title")}</Heading>
            <Text color="secondary">{t("friends.intro")}</Text>
          </VStack>
          <Popover isOpen={adding} onOpenChange={setAdding} alignment="end" dialogLabel="Add friend" content={
            <VStack gap={3} padding={4} style={{ width: 280 }}>
              <TextInput label={t("friends.theirCode")} value={code} onChange={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" autoComplete="off" maxLength={12}
                hasAutoFocus onEnter={() => { if (code.trim().length >= 6 && !busy) addFriend(); }} />
              <Button label={t("friends.send")} variant="primary" isDisabled={busy || code.trim().length < 6} onClick={addFriend} />
            </VStack>}>
            <Button label="Add friend" variant="primary" icon={icon(UserPlus)} />
          </Popover>
        </HStack>

        {problem && <Banner status="error" title={problem} container="section" isDismissable onDismiss={() => setProblem("")} />}

        <HStack gap={2} align="center" wrap="wrap">
          <Text type="supporting" color="secondary">{t("friends.yourCode")}</Text>
          <span className="friend-chip" aria-label={t("friends.yourCode")}>{me.code}</span>
          <IconButton label={t("friends.copy")} tooltip={t("friends.copy")} variant="ghost" icon={icon(Copy)} onClick={copyCode} />
          <IconButton label="Share invite link" tooltip="Share invite link" variant="ghost" icon={icon(Share2)} onClick={shareInvite} />
        </HStack>

        {incoming.length > 0 && <VStack gap={2}>
          <Heading level={2}>{t("friends.requests")}</Heading>
          <List hasDividers>
            {incoming.map((item) => <ListItem key={item.id} label={item.name} startContent={person(item)} endContent={<HStack gap={2}>
              <Button label={t("friends.accept")} size="sm" variant="primary" isDisabled={busy} onClick={() => run(() => api.acceptFriend(item.id), t("friends.accepted"))} />
              <Button label={t("friends.decline")} size="sm" variant="ghost" isDisabled={busy} tooltip={`${t("friends.decline")} ${item.name}`} onClick={() => run(() => api.removeFriend(item.id))} />
            </HStack>} />)}
          </List>
        </VStack>}

        <VStack gap={2}>
          <Heading level={2}>{t("friends.list")}</Heading>
          {friends.length === 0
            ? <Text color="secondary">{t("friends.empty")}</Text>
            : <List hasDividers>
              {friends.map((item) => <ListItem key={item.id} label={item.name} description={item.level ? t("xp.level").replace("{level}", item.level) : undefined} startContent={person(item)}
                endContent={<MoreMenu label={`Options for ${item.name}`} alignment="end" items={[{ label: t("friends.remove"), icon: icon(UserMinus), variant: "destructive", onClick: () => run(() => api.removeFriend(item.id), t("friends.removed")) }]} />} />)}
            </List>}
          <HStack gap={2}><Button label={t("challenges.title")} variant="ghost" size="sm" href="/challenges" /><Button label={t("circles.title")} variant="ghost" size="sm" href="/circles" /></HStack>
        </VStack>

        {outgoing.length > 0 && <VStack gap={2}>
          <Heading level={2}>{t("friends.waiting")}</Heading>
          <List hasDividers>
            {outgoing.map((item) => <ListItem key={item.id} label={item.name} startContent={person(item)}
              endContent={<Button label={t("friends.cancel")} size="sm" variant="ghost" isDisabled={busy} tooltip={`${t("friends.cancel")} ${item.name}`} onClick={() => run(() => api.removeFriend(item.id))} />} />)}
          </List>
        </VStack>}

        <VStack gap={0}>
          <Heading level={2}>{t("friends.privacy")}</Heading>
          <SettingRow label={t("friends.displayName")} help={t("friends.displayHint").replace("{name}", me.defaultName)}>
            <ClickToEdit label="Display name" value={me.displayName} placeholder={me.defaultName} allowEmpty onSave={(name) => run(() => api.updateFriendSettings({ displayName: name }), t("friends.saved"))} />
          </SettingRow>
          <SettingRow label={t("friends.hide")} help={t("friends.hideHint")}>
            <Switch label={t("friends.hide")} isLabelHidden value={me.hideActivity} isDisabled={busy} onChange={(on) => run(() => api.updateFriendSettings({ hideActivity: on }), t("friends.saved"))} />
          </SettingRow>
        </VStack>
      </VStack>
    </div>
  </AstryxTheme>;
}
