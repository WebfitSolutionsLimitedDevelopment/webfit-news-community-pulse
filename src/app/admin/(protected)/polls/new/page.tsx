import { createPoll } from "@/app/admin/(protected)/polls/actions";

const defaultDisclaimer =
  "This is an independent, voluntary online community poll conducted by Webfit News. It is not an official election, is not operated or endorsed by the New Zealand Electoral Commission, and is not a scientific or nationally representative survey.";

const defaultMethodology =
  "Participation is voluntary. Each verified email address may submit one response. Results reflect only people who chose to participate and should not be interpreted as representing all New Zealand voters.";

export default function NewPollPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
          New poll
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Create a Community Pulse poll
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
          Create the poll as a draft first. You can add options, review the
          wording and open voting from the management screen.
        </p>
      </div>

      <form
        action={createPoll}
        className="space-y-8 rounded-[2rem] border border-black/10 bg-white p-7 shadow-sm md:p-10"
      >
        <section className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Basic information
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Poll details</h2>
          </div>

          <Field
            name="internal_name"
            label="Internal name"
            placeholder="2026 General Election Community Pulse"
            required
          />

          <Field
            name="slug"
            label="Public URL slug"
            placeholder="election-2026"
            description="Use lowercase letters, numbers and hyphens only."
            required
          />

          <Field
            name="title"
            label="Public title"
            placeholder="Webfit News Community Pulse 2026"
            required
          />

          <TextArea
            name="question"
            label="Poll question"
            placeholder="If the 2026 General Election were held today, which party would you be most likely to give your party vote to?"
            required
          />

          <TextArea
            name="description"
            label="Description"
            placeholder="Briefly explain the purpose of this poll."
          />
        </section>

        <section className="space-y-6 border-t border-black/10 pt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Editorial settings
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Status and results
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Initial status</span>

              <select
                name="status"
                defaultValue="draft"
                className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-[#7b1025]"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="open">Open</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">
                Result visibility
              </span>

              <select
                name="results_visibility"
                defaultValue="private"
                className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-[#7b1025]"
              >
                <option value="private">Private</option>
                <option value="live">Live while voting</option>
                <option value="published">Published after closing</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5 py-4">
            <input
              type="checkbox"
              name="is_public"
              className="mt-1 h-4 w-4 accent-[#7b1025]"
            />

            <span>
              <span className="block text-sm font-semibold">
                Show this poll on the public website
              </span>

              <span className="mt-1 block text-sm leading-6 text-neutral-500">
                Leave this unticked while preparing and reviewing the poll.
              </span>
            </span>
          </label>
        </section>

        <section className="space-y-6 border-t border-black/10 pt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Transparency
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Methodology and disclaimer
            </h2>
          </div>

          <TextArea
            name="methodology"
            label="Methodology"
            defaultValue={defaultMethodology}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-950">
              Default public disclaimer
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              {defaultDisclaimer}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="rounded-2xl bg-[#7b1025] px-7 py-3 font-semibold text-white transition hover:bg-[#5c0b1b]"
          >
            Create poll
          </button>

          <a
            href="/admin"
            className="rounded-2xl border border-black/10 px-7 py-3 text-center font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

type FieldProps = {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
};

function Field({
  name,
  label,
  placeholder,
  description,
  required,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>

      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none transition focus:border-[#7b1025]"
      />

      {description && (
        <span className="mt-2 block text-xs leading-5 text-neutral-500">
          {description}
        </span>
      )}
    </label>
  );
}

type TextAreaProps = {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

function TextArea({
  name,
  label,
  placeholder,
  defaultValue,
  required,
}: TextAreaProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>

      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={5}
        className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none transition focus:border-[#7b1025]"
      />
    </label>
  );
}