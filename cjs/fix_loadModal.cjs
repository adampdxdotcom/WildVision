const fs = require('fs');

let code = fs.readFileSync('src/components/ProjectBrowser/LoadModal.tsx', 'utf8');

code = code.replace(
  ".select('*, profiles(email, first_name, last_name), project_shares(id)')",
  ".select('*, profiles(email, first_name, last_name), project_shares(*)')"
);

// We need to calculate explicitPermission
// Inside handleLoadCloudProject:
code = code.replace(
  "loadProjectState(project.state_payload, project.id, project.name, (project as any).user_id);",
  `
        let explicitPermission = undefined;
        if (user && project.user_id !== user.id && project.project_shares) {
          const myShare = project.project_shares.find((s: any) => s.user_id === user.id);
          if (myShare) {
            explicitPermission = myShare.permission_tier;
          }
        }
        loadProjectState(project.state_payload, project.id, project.name, (project as any).user_id, explicitPermission);`
);

fs.writeFileSync('src/components/ProjectBrowser/LoadModal.tsx', code);
