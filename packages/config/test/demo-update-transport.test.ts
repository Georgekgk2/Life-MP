import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { demoUpdateSshOptions } from "../src/demo-update-transport.js";
import type { DemoUpdateAuthorization } from "../src/demo-update-authorization.js";

// Real OpenSSH config evaluation only: -G never opens a connection.
describe("scoped demo SSH effective transport", () => {
  it("overrides a different target and denies inherited session reuse and credential forwarding", () => {
    const dir = mkdtempSync(join(tmpdir(), "life-demo-ssh-"));
    try {
      const config = join(dir, "config");
      writeFileSync(
        config,
        [
          "Host jorvis-prod-vm",
          " HostName 192.0.2.9",
          " User wrong-user",
          " Port 2200",
          " ControlMaster auto",
          " ControlPath /tmp/unrelated-master",
          " ControlPersist yes",
          " ForwardAgent yes",
          " ForwardX11 yes",
          " ProxyCommand /usr/bin/false",
          " PermitLocalCommand yes",
        ].join("\n"),
      );
      const grant: Pick<DemoUpdateAuthorization, "host" | "ssh_user"> = {
        host: "34.139.21.224",
        ssh_user: "medgemma-user",
      };
      const output = execFileSync(
        "ssh",
        ["-G", "-F", config, ...demoUpdateSshOptions(grant, false)],
        { encoding: "utf8", timeout: 10000 },
      );
      const effective = new Map(
        output.split("\n").map((line) => {
          const separator = line.indexOf(" ");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
      );
      const disabled = (key: string) => {
        const value = effective.get(key);
        return (
          value === undefined || ["no", "false", "none", "0"].includes(value)
        );
      };
      expect(effective.get("hostname")).toBe("34.139.21.224");
      expect(effective.get("user")).toBe("medgemma-user");
      expect(effective.get("port")).toBe("22");
      expect(effective.get("stricthostkeychecking")).toBe("true");
      expect(disabled("controlpath")).toBe(true);
      expect(disabled("controlmaster")).toBe(true);
      expect(disabled("controlpersist")).toBe(true);
      expect(disabled("forwardagent")).toBe(true);
      expect(disabled("forwardx11")).toBe(true);
      expect(disabled("proxycommand")).toBe(true);
      expect(disabled("permitlocalcommand")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
