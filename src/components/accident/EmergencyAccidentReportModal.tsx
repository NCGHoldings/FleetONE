import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Camera, Mic, Square, Upload, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmergencyAccidentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmergencyAccidentReportModal({ open, onOpenChange, onSuccess }: EmergencyAccidentReportModalProps) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!vehicleNumber.trim()) {
      toast.error("Vehicle number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // 1. Create Accident Record
      const accidentData = {
        vehicle_number: vehicleNumber.toUpperCase().trim(),
        accident_date: new Date().toISOString(),
        details_of_accident: notes.trim() || "Emergency Report",
        status: "Reported",
        accident_mark: true,
        reported_by: "Emergency App Mode"
      };

      const accidentRes = await fetch('https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-records', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accidentData)
      });

      if (!accidentRes.ok) throw new Error("Failed to create accident record.");
      const accidentResult = await accidentRes.json();
      const newAccidentId = accidentResult.data?.id;

      if (!newAccidentId) throw new Error("No ID returned for new accident record.");

      // 2. Upload Photo if present
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('documentType', 'Accident Photos');

        await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-documents/${newAccidentId}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData
        });
      }

      // 3. Upload Audio if present
      if (audioBlob) {
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('documentType', 'Voice Notes');

        await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-documents/${newAccidentId}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData
        });
      }

      toast.success("Emergency report submitted successfully.");
      
      // Reset form
      setVehicleNumber("");
      setNotes("");
      setPhotoFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="max-w-md w-[95vw] p-4 sm:p-6 rounded-xl overflow-hidden bg-white/95 backdrop-blur-xl border border-red-100 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-red-600 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">🚨</span>
            Emergency Accident Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="emergency_vehicle" className="text-sm font-semibold">Vehicle Number *</Label>
            <Input 
              id="emergency_vehicle"
              placeholder="e.g. NC 8759"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="text-lg font-mono uppercase bg-slate-50"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Camera / Photo Button */}
            <div className="relative">
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                id="camera_input"
                className="hidden"
                onChange={handlePhotoCapture}
                disabled={isSubmitting}
              />
              <Button 
                type="button"
                variant={photoFile ? "default" : "outline"}
                className={`w-full h-20 flex flex-col gap-2 ${photoFile ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                onClick={() => document.getElementById('camera_input')?.click()}
                disabled={isSubmitting}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs whitespace-normal">{photoFile ? 'Photo Captured' : 'Take Photo'}</span>
              </Button>
            </div>

            {/* Voice Recorder Button */}
            <Button 
              type="button"
              variant={isRecording ? "destructive" : audioBlob ? "default" : "outline"}
              className={`w-full h-20 flex flex-col gap-2 ${audioBlob && !isRecording ? 'bg-green-600 hover:bg-green-700' : !isRecording ? 'bg-slate-50 hover:bg-slate-100' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting}
            >
              {isRecording ? (
                <>
                  <Square className="h-6 w-6 fill-current animate-pulse" />
                  <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
                </>
              ) : (
                <>
                  <Mic className="h-6 w-6" />
                  <span className="text-xs whitespace-normal">{audioBlob ? 'Voice Recorded' : 'Record Voice'}</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_notes" className="text-sm font-semibold">Notes (Optional)</Label>
            <Textarea 
              id="emergency_notes"
              placeholder="Brief description of the incident..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-24 bg-slate-50"
              disabled={isSubmitting}
            />
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold shadow-lg bg-red-600 hover:bg-red-700 text-white" 
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !vehicleNumber.trim()}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Report...</>
            ) : (
              <><Send className="mr-2 h-5 w-5" /> Submit Emergency Report</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
