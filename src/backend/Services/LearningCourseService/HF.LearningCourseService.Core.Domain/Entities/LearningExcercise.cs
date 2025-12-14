namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningExcercise
    : BaseEntity
{
    private List<LearningContentItem> _taskContentItems = [];

    public Guid LearningModuleId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int Number { get; set; } = 0;

    public ExcerciseAppType AppType { get; set; }

    public string AppVersion { get; set; } = string.Empty;

    public IEnumerable<LearningContentItem> TaskContentItems => _taskContentItems;

    public string TaskAppSettings { get; set; } = string.Empty;

    public void AddTaskContentItems(List<LearningContentItem> items)
    {
        if (items != null && items.Any())
        {
            _taskContentItems.AddRange(items);
        }
    }

    public void ClearTaskContentItems()
    {
        _taskContentItems.Clear();
    }

}

public enum ExcerciseAppType
{
    ScoreAnalysis = 0,
    MidiPerformance = 1,
    AudioIdentification = 2
}