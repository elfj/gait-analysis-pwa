import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createPatient } from '@/lib/db/repositories';
import type { Patient } from '@/types/patient';

const currentYear = new Date().getFullYear();

const patientFormSchema = z.object({
  birthYear: z.coerce
    .number()
    .int('Birth year must be a whole number.')
    .min(1900, 'Birth year must be 1900 or later.')
    .max(currentYear, 'Birth year cannot be in the future.'),
  diagnosis: z.enum(['healthy', 'parkinson', 'stroke', 'other_neurological']),
  externalId: z.string().trim().max(64, 'External ID must be 64 characters or fewer.'),
  heightCm: z.coerce
    .number()
    .min(80, 'Height must be at least 80 cm.')
    .max(230, 'Height must be 230 cm or less.'),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.'),
  sex: z.enum(['M', 'F', 'other']),
});

type PatientFormInput = z.input<typeof patientFormSchema>;
type PatientFormValues = z.output<typeof patientFormSchema>;

/** Data access contract used by the new patient page. */
export interface NewPatientPageRepository {
  /** Persist one patient and return its identifier. */
  createPatient: (patient: Patient) => Promise<string>;
}

const defaultRepository: NewPatientPageRepository = {
  createPatient,
};

/** Render the validated new patient form. */
export function NewPatientPage({
  repository = defaultRepository,
}: {
  /** Optional repository override for focused UI tests. */
  repository?: NewPatientPageRepository;
}): React.JSX.Element {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PatientFormInput, undefined, PatientFormValues>({
    defaultValues: {
      birthYear: currentYear - 60,
      diagnosis: 'healthy',
      externalId: '',
      heightCm: 170,
      notes: '',
      sex: 'F',
    },
    resolver: zodResolver(patientFormSchema),
  });

  /** Validate and persist a de-identified patient record. */
  async function onSubmit(values: PatientFormValues): Promise<void> {
    setSubmitError(null);

    const patient: Patient = {
      birthYear: values.birthYear,
      createdAt: new Date().toISOString(),
      diagnosis: values.diagnosis,
      heightCm: values.heightCm,
      id: crypto.randomUUID(),
      sex: values.sex,
      ...(values.externalId.length > 0 ? { externalId: values.externalId } : {}),
      ...(values.notes.length > 0 ? { notes: values.notes } : {}),
    };

    try {
      await repository.createPatient(patient);
      navigate('/');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create patient.');
    }
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Patient Setup</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">New Patient</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Create a de-identified local patient record for 10MWT assessment.
        </p>
      </div>

      <form
        className="space-y-5 rounded-md border border-slate-200 bg-white p-6"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            errorMessage={errors.externalId?.message}
            label="External ID"
            placeholder="MRN or clinic code"
            registration={register('externalId')}
          />
          <TextField
            errorMessage={errors.birthYear?.message}
            label="Birth year"
            registration={register('birthYear')}
            type="number"
          />
          <SelectField
            errorMessage={errors.sex?.message}
            label="Sex"
            options={[
              { label: 'Female', value: 'F' },
              { label: 'Male', value: 'M' },
              { label: 'Other', value: 'other' },
            ]}
            registration={register('sex')}
          />
          <TextField
            errorMessage={errors.heightCm?.message}
            label="Height (cm)"
            registration={register('heightCm')}
            type="number"
          />
          <SelectField
            errorMessage={errors.diagnosis?.message}
            label="Diagnosis category"
            options={[
              { label: 'Healthy', value: 'healthy' },
              { label: 'Parkinson', value: 'parkinson' },
              { label: 'Stroke', value: 'stroke' },
              { label: 'Other neurological', value: 'other_neurological' },
            ]}
            registration={register('diagnosis')}
          />
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-950">Notes</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            {...register('notes')}
          />
          {errors.notes?.message ? <FieldError message={errors.notes.message} /> : null}
        </label>

        {submitError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save Patient
          </button>
          <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
            Back to patients
          </Link>
        </div>
      </form>
    </section>
  );
}

/** Render a labeled text input with validation feedback. */
function TextField({
  errorMessage,
  label,
  placeholder,
  registration,
  type = 'text',
}: {
  /** Validation error message. */
  errorMessage?: string | undefined;
  /** Input label. */
  label: string;
  /** Input placeholder. */
  placeholder?: string;
  /** react-hook-form registration props. */
  registration: UseFormRegisterReturn;
  /** HTML input type. */
  type?: 'number' | 'text';
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-950">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        placeholder={placeholder}
        type={type}
        {...registration}
      />
      {errorMessage ? <FieldError message={errorMessage} /> : null}
    </label>
  );
}

/** Render a labeled select input with validation feedback. */
function SelectField({
  errorMessage,
  label,
  options,
  registration,
}: {
  /** Validation error message. */
  errorMessage?: string | undefined;
  /** Select label. */
  label: string;
  /** Available select options. */
  options: { label: string; value: string }[];
  /** react-hook-form registration props. */
  registration: UseFormRegisterReturn;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-950">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        {...registration}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage ? <FieldError message={errorMessage} /> : null}
    </label>
  );
}

/** Render one field validation error. */
function FieldError({ message }: { /** Error message text. */ message: string }): React.JSX.Element {
  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}
