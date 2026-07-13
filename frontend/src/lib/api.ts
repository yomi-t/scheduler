export type Slots = Record<string, number[]>;

export type Project = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  createdAt: string;
};

export type Participant = {
  id: string;
  nickname: string;
  comment: string;
  slots: Slots;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = Project & { participants: Participant[] };

export type ProjectInput = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

export type ParticipantInput = {
  nickname: string;
  comment: string;
  slots: Slots;
};

const BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "サーバーに接続できませんでした");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body.error === "string"
        ? body.error
        : "エラーが発生しました";
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export function createProject(input: ProjectInput): Promise<Project> {
  return request("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProject(id: string): Promise<ProjectDetail> {
  return request(`/api/projects/${encodeURIComponent(id)}`);
}

export function addParticipant(
  projectId: string,
  input: ParticipantInput,
): Promise<Participant> {
  return request(`/api/projects/${encodeURIComponent(projectId)}/participants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateParticipant(
  projectId: string,
  participantId: string,
  input: ParticipantInput,
): Promise<Participant> {
  return request(
    `/api/projects/${encodeURIComponent(projectId)}/participants/${encodeURIComponent(participantId)}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}
