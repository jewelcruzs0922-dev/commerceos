export type FormActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialFormState: FormActionState = { status: "idle" };

export function fieldError(
  state: FormActionState,
  name: string
): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}
