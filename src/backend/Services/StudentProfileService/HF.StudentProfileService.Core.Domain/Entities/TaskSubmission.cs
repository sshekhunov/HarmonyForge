namespace HF.StudentProfileService.Core.Domain.Entities;

public class TaskSubmission : BaseEntity
{
    public Student Student { get; set; } = null!;

    public Guid ExcerciseId { get; set; }

    public DateTime DateTime { get; set; }

    public string SubmissionContent { get; set; } = null!;

    public string SubmissionResult { get; set; } = null!;

    public double? Score { get; set; }
}