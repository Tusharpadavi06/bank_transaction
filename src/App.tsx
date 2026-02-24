/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Send, 
  Building2, 
  User, 
  CreditCard, 
  Calendar, 
  IndianRupee, 
  LogOut, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

const billSchema = z.object({
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
});

const formSchema = z.object({
  email: z.string().email("Valid company email is required"),
  unit: z.string().min(1, "Unit selection is required"),
  beneficiaryName: z.string().min(2, "Beneficiary name is required"),
  accountNo: z.string().min(5, "Account number is required"),
  ifscCode: z.string().min(11, "Valid IFSC code is required").max(11),
  bills: z.array(billSchema).min(1, "At least one bill is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function App() {
  const [units, setUnits] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [history, setHistory] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [beneficiarySuggestions, setBeneficiarySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      bills: [{ billDate: "", dueDate: "", amount: "" as any }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bills",
  });

  const watchedEmail = watch("email");
  const watchedBeneficiaryName = watch("beneficiaryName");

  useEffect(() => {
    const searchBeneficiaries = async () => {
      if (watchedBeneficiaryName && watchedBeneficiaryName.length >= 2) {
        setSearching(true);
        try {
          const res = await fetch(`/api/beneficiaries/search?name=${encodeURIComponent(watchedBeneficiaryName)}`);
          const data = await res.json();
          setBeneficiarySuggestions(data.beneficiaries || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Search error", err);
        } finally {
          setSearching(false);
        }
      } else {
        setBeneficiarySuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(searchBeneficiaries, 300);
    return () => clearTimeout(timer);
  }, [watchedBeneficiaryName]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.orders || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const selectBeneficiary = (b: any) => {
    setValue("beneficiaryName", b.name || b.Name || "");
    setValue("accountNo", b.account_no || b.AccountNo || b.account || "");
    setValue("ifscCode", b.ifsc_code || b.IFSC || b.ifsc || "");
    setShowSuggestions(false);
  };

  const testConnection = async () => {
    try {
      const res = await fetch("/api/debug/supabase");
      const data = await res.json();
      setDebugInfo(data);
    } catch (err) {
      setDebugInfo({ status: "error", message: "Failed to reach debug endpoint" });
    }
  };

  useEffect(() => {
    const fetchUnits = async () => {
      if (watchedEmail && watchedEmail.includes("@") && watchedEmail.includes(".")) {
        try {
          const res = await fetch(`/api/units?email=${encodeURIComponent(watchedEmail)}`);
          const data = await res.json();
          setUnits(data.units);
          if (data.units.length === 1) {
            setValue("unit", data.units[0]);
          }
        } catch (err) {
          console.error("Failed to fetch units", err);
        }
      } else {
        setUnits([]);
        setValue("unit", "");
      }
    };

    const timer = setTimeout(fetchUnits, 400);
    return () => clearTimeout(timer);
  }, [watchedEmail, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSubmitted(true);
        reset();
        setUnits([]);
      } else {
        const errData = await res.json();
        setError(errData.error || "Submission failed");
      }
    } catch (err) {
      setError("An unexpected error occurred. Check server logs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ebf8] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border-t-[12px] border-[#673ab7]">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center gap-8 mb-6">
              <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center border border-slate-100 p-2 shadow-sm">
                <img 
                  src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
                  alt="GINZA Logo" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">GINZA</h1>
                <p className="text-base font-bold text-slate-600 tracking-[0.15em] uppercase mt-1">Industries Limited</p>
                <div className="h-1 w-20 bg-[#673ab7] mt-3 mx-auto sm:mx-0" />
              </div>
            </div>
            <div className="h-px bg-slate-200 my-6" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">Bill Submission Portal</h2>
            <p className="text-sm text-slate-600 font-bold mt-2">
              Please provide the beneficiary and bill details below.
            </p>
            <p className="text-[10px] text-red-600 font-black mt-3 uppercase tracking-widest">* Required</p>

            <button 
              type="button"
              onClick={testConnection}
              className="mt-4 text-[10px] text-slate-400 hover:text-[#673ab7] font-bold uppercase tracking-widest"
            >
              Check Database Connection
            </button>
            {debugInfo && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono overflow-auto max-h-40">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center border border-slate-200"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-4 uppercase">Submission Successful</h2>
            <p className="text-sm text-slate-600 font-bold mb-10">Your data has been recorded successfully.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-[#673ab7] hover:underline font-black uppercase tracking-widest text-xs"
            >
              Submit another response
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* User Identification Section */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-black text-slate-900 uppercase tracking-wide block">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[10px] font-bold text-slate-500">Enter your official company email address.</p>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="your.email@ginzalimited.com"
                    className="w-full border-b-2 border-slate-200 focus:border-[#673ab7] outline-none py-1.5 transition-all text-base font-bold text-slate-800 placeholder:text-slate-300"
                  />
                  {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-base font-black text-slate-900 uppercase tracking-wide block">
                    Unit Selection <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register("unit")}
                      disabled={units.length === 0}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-50 focus:border-[#673ab7] outline-none transition-all disabled:opacity-50 appearance-none font-black text-slate-700 text-sm"
                    >
                      <option value="">{units.length === 0 ? "Waiting for valid email..." : "Select Unit"}</option>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Plus className="w-5 h-5 text-slate-400 rotate-45" />
                    </div>
                  </div>
                  {errors.unit && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.unit.message}</p>}
                </div>
              </div>
            </div>

            {/* Beneficiary Section */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
              <h2 className="text-lg font-black text-slate-900 border-b-4 border-slate-50 pb-2 uppercase tracking-wider">Beneficiary Information</h2>
              
              <div className="space-y-6">
                <div className="space-y-2 relative">
                  <label className="text-base font-black text-slate-900 uppercase tracking-wide block">Beneficiary Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      {...register("beneficiaryName")}
                      autoComplete="off"
                      placeholder="Enter full name as per bank records"
                      className="w-full border-b-2 border-slate-200 focus:border-[#673ab7] outline-none py-1.5 pr-8 transition-all font-bold text-base text-slate-800 placeholder:text-slate-300"
                    />
                    {watchedBeneficiaryName && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {searching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        <button
                          type="button"
                          onClick={() => {
                            setValue("beneficiaryName", "");
                            setValue("accountNo", "");
                            setValue("ifscCode", "");
                            setBeneficiarySuggestions([]);
                            setShowSuggestions(false);
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {showSuggestions && beneficiarySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                      {beneficiarySuggestions.map((b, index) => (
                        <button
                          key={b.id || b.name || index}
                          type="button"
                          onClick={() => selectBeneficiary(b)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <p className="font-black text-slate-900 text-xs">{b.name || b.Name}</p>
                          <p className="text-[10px] text-slate-500 font-bold">
                            {b.account_no || b.AccountNo || b.account || "N/A"} | {b.ifsc_code || b.IFSC || b.ifsc || "N/A"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSuggestions && beneficiarySuggestions.length === 0 && watchedBeneficiaryName.length >= 2 && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 p-3 text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No matching beneficiary found</p>
                    </div>
                  )}
                  {errors.beneficiaryName && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.beneficiaryName.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-base font-black text-slate-900 uppercase tracking-wide block">Account Number <span className="text-red-500">*</span></label>
                    <input
                      {...register("accountNo")}
                      placeholder="Bank Account #"
                      className="w-full border-b-2 border-slate-200 focus:border-[#673ab7] outline-none py-1.5 transition-all font-bold text-base text-slate-800 placeholder:text-slate-300"
                    />
                    {errors.accountNo && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.accountNo.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-base font-black text-slate-900 uppercase tracking-wide block">IFSC Code <span className="text-red-500">*</span></label>
                    <input
                      {...register("ifscCode")}
                      placeholder="11-character IFSC"
                      className="w-full border-b-2 border-slate-200 focus:border-[#673ab7] outline-none py-1.5 transition-all uppercase font-bold text-base text-slate-800 placeholder:text-slate-300"
                    />
                    {errors.ifscCode && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.ifscCode.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Bill Details */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#673ab7]" />
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Bill Details</h2>
                </div>
                <button
                  type="button"
                  onClick={() => append({ billDate: "", dueDate: "", amount: "" as any })}
                  className="flex items-center gap-2 bg-indigo-50 text-[#673ab7] hover:bg-indigo-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group shadow-sm"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Bill Date <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            {...register(`bills.${index}.billDate` as const)}
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-[#673ab7] outline-none transition-all"
                          />
                          {errors.bills?.[index]?.billDate && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">{errors.bills[index]?.billDate?.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Due Date <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            {...register(`bills.${index}.dueDate` as const)}
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-[#673ab7] outline-none transition-all"
                          />
                          {errors.bills?.[index]?.dueDate && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">{errors.bills[index]?.dueDate?.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Amount <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...register(`bills.${index}.amount` as const, { valueAsNumber: true })}
                              className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black focus:ring-4 focus:ring-indigo-50 focus:border-[#673ab7] outline-none transition-all"
                            />
                          </div>
                          {errors.bills?.[index]?.amount && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">{errors.bills[index]?.amount?.message}</p>
                          )}
                        </div>
                      </div>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute -right-3 -top-3 w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm font-black uppercase tracking-wide">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#673ab7] hover:bg-[#5e35b1] disabled:bg-indigo-300 text-white font-black py-5 px-8 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-200 uppercase tracking-[0.2em] text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Submit Response
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
