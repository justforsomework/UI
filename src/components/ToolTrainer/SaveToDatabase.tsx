import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { Content, ChunkKind } from "../../types/toolTrainer";
import { examplesApi } from "../../api";
import { useToast } from "../../hooks/use-toast";

interface SaveToDatabaseProps {
  messages: Content[];
  tags?: string[];
  exampleName?: string;
}

export const SaveToDatabase: React.FC<SaveToDatabaseProps> = ({
  messages = [],
  tags = [],
  exampleName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(exampleName);
  const [description, setDescription] = useState("");
  const [localTags, setLocalTags] = useState(tags);
  const [saveMode, setSaveMode] = useState<"database" | "json">("database");
  const [filePath, setFilePath] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setName(exampleName);
      setLocalTags(tags);
      // Optionally reset description if you want to sync it too
      // setDescription('');
    }
  }, [isOpen, exampleName, tags]);

  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Filter out chunks with empty or missing text
      const filteredMessages = messages
        .map((content) => ({
          ...content,
          chunks: content.chunks.filter(
            (chunk) => chunk.text && chunk.text.trim() !== ""
          ),
        }))
        .filter((content) => content.chunks.length > 0); // Remove empty messages

      const payload = {
        name: name || `Example ${Date.now()}`,
        description: description || "",
        messages: filteredMessages,
        tags: localTags,
        is_global: true,
        is_eval: false,
        readable_by_user_ids: [],
        readable_by_group_ids: [],
      };

      console.log("Payload being sent:", JSON.stringify(payload, null, 2));

      if (saveMode === "database") {
        // Save to Database using API
        await examplesApi.createExample(payload);
        toast({
          title: "Success",
          description: "Example saved to database successfully",
        });
      } else {
        // Save to JSON  File using API
        if (!filePath.trim()) {
          toast({
            title: "Error",
            description: "Please provide a file path for the JSON file.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        await examplesApi.saveToJSON(filePath, payload);
        toast({
          title: "Success",
          description: "Example saved to JSON file successfully",
        });
      }

      setIsOpen(false);
      setName("");
      setDescription("");
      setLocalTags([]);
      setFilePath("");
    } catch (error) {
      console.error("Error saving example:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save example",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-purple-500/20 border-purple-400/50 text-purple-300 hover:bg-purple-500/30 hover:border-purple-400 shadow-lg transition-all duration-200 px-6 h-11"
        >
          <Save className="w-4 h-4 mr-2" />
          Save to DB
        </Button>
      </DialogTrigger>

      <DialogContent
        className="bg-gray-800 border-gray-600 text-white max-w-2xl"
        aria-describedby="save-to-db-description"
      >
        <DialogHeader>
          <DialogTitle className="text-purple-300">
            Save Example to Database
          </DialogTitle>
        </DialogHeader>

        <div id="save-to-db-description" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Save Mode</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={saveMode === "database"}
                  onChange={() => setSaveMode("database")}
                />
                <span>Database</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={saveMode === "json"}
                  onChange={() => setSaveMode("json")}
                />
                <span>JSON File</span>
              </label>
            </div>
          </div>

          {saveMode === "json" && (
            <div className="space-y-2">
              <Label htmlFor="markdown_path" className="text-gray-300">
                JSON File Path
              </Label>
              <Input
                id="markdown_path"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g. /mnt/examples/example1.json"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="example_name" className="text-gray-300">
              Example Name (Required)
            </Label>
            <Input
              id="example_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter example name..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="example_description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="example_description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this example..."
              className="bg-gray-700 border-gray-600 text-white min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="messages_preview" className="text-gray-300">
              Messages (chunks:{" "}
              {messages.reduce(
                (acc, msg) => acc + (msg.chunks?.length || 0),
                0
              )}
              )
            </Label>
            <div className="bg-gray-700 border border-gray-600 rounded p-3 max-h-32 overflow-y-auto">
              {messages.length > 0 ? (
                messages.flatMap((msg, mIdx) =>
                  msg.chunks.map((chunk, cIdx) => (
                    <div
                      key={`${mIdx}-${cIdx}`}
                      className="text-xs text-gray-300 mb-1"
                    >
                      <span className="font-medium text-purple-400">
                        {typeof chunk.kind === "number"
                          ? ChunkKind[chunk.kind] || "CONTENT"
                          : chunk.kind || "CONTENT"}
                      </span>
                      : {chunk.text ? chunk.text.substring(0, 100) : ""}
                      ...
                    </div>
                  ))
                )
              ) : (
                <span className="text-gray-500">No messages to save</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-gray-300">
              Tags (comma separated)
            </Label>
            <Input
              id="tags"
              value={localTags.join(", ")}
              onChange={(e) =>
                setLocalTags(
                  e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag)
                )
              }
              placeholder="Enter tags separated by commas"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || messages.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving
                ? "Saving..."
                : saveMode === "database"
                ? "Save to Database"
                : "Save to Markdown"}
            </Button>

            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
